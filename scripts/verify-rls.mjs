import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name}.`);
  return value;
}

function createUserClient(url, anonKey) {
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

async function signIn(url, anonKey, email, password) {
  const client = createUserClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

function pass(label) {
  console.log(`PASS ${label}`);
}

function fail(label, error) {
  console.error(`FAIL ${label}${error ? `: ${error.message ?? error}` : ""}`);
  return false;
}

async function expectNoForeignRows(label, queryPromise) {
  const { data, error } = await queryPromise;
  if (error) throw error;
  if ((data ?? []).length > 0) throw new Error("La consulta devolvio datos ajenos.");
  pass(label);
  return true;
}

async function expectWriteDenied(label, queryPromise) {
  const { data, error } = await queryPromise;
  if (error) {
    pass(label);
    return true;
  }
  if (Array.isArray(data) && data.length === 0) {
    pass(label);
    return true;
  }
  if (data === null) {
    pass(label);
    return true;
  }
  throw new Error("La escritura indebida tuvo exito.");
}

async function cleanup(admin, ids, authUserIds) {
  const cleanupErrors = [];
  const remove = async (label, fn) => {
    if (Array.isArray(fn.values) && fn.values.length === 0) return;
    try {
      const result = await fn.run();
      if (result?.error) throw result.error;
    } catch (error) {
      cleanupErrors.push(`${label}: ${error.message ?? String(error)}`);
    }
  };

  await remove("current_accounts", { values: ids.currentAccounts, run: () => admin.from("current_accounts").delete().in("id", ids.currentAccounts) });
  await remove("trips", { values: ids.trips, run: () => admin.from("trips").delete().in("id", ids.trips) });
  await remove("hour_records", { values: ids.hourRecords, run: () => admin.from("hour_records").delete().in("id", ids.hourRecords) });
  await remove("km_records", { values: ids.kmRecords, run: () => admin.from("km_records").delete().in("id", ids.kmRecords) });
  await remove("buses", { values: ids.buses, run: () => admin.from("buses").delete().in("id", ids.buses) });
  await remove("profiles", { values: ids.profiles, run: () => admin.from("profiles").delete().in("id", ids.profiles) });
  await remove("audit_log", { values: ids.auditLogTenantIds, run: () => admin.from("audit_log").delete().in("tenant_id", ids.auditLogTenantIds) });
  await remove("tenants", { values: ids.tenants, run: () => admin.from("tenants").delete().in("id", ids.tenants) });

  for (const userId of authUserIds) {
    await remove(`auth user ${userId}`, { values: [userId], run: () => admin.auth.admin.deleteUser(userId) });
  }

  if (cleanupErrors.length) {
    console.error("La limpieza tuvo errores. Recuperacion manual requerida para estos IDs:");
    console.error(JSON.stringify({ ids, authUserIds }, null, 2));
    console.error(cleanupErrors.join("\n"));
    return false;
  }

  return true;
}

async function insertOne(client, table, values) {
  const { data, error } = await client.from(table).insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

async function main() {
  loadDotEnvLocal();

  if (process.env.ALLOW_RLS_VERIFICATION !== "true") {
    throw new Error("Abortado: definir ALLOW_RLS_VERIFICATION=true para ejecutar verificacion RLS.");
  }

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secretKey) throw new Error("Falta SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY server-only.");

  const prefix = `rls-check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `${prefix}-Password123!`;
  const admin = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const ids = {
    tenants: [],
    profiles: [],
    buses: [],
    kmRecords: [],
    hourRecords: [],
    trips: [],
    currentAccounts: [],
    auditLogTenantIds: []
  };
  const authUserIds = [];
  let ok = true;

  try {
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    ids.tenants.push(tenantA, tenantB);
    ids.auditLogTenantIds.push(tenantA, tenantB);

    const adminAEmail = `${prefix}-admin-a@example.com`;
    const adminBEmail = `${prefix}-admin-b@example.com`;
    const driverAEmail = `${prefix}-driver-a@example.com`;
    const candidateEmail = `${prefix}-candidate@example.com`;

    const createdUsers = [];
    for (const email of [adminAEmail, adminBEmail, driverAEmail, candidateEmail]) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (error) throw error;
      createdUsers.push(data.user);
      authUserIds.push(data.user.id);
    }

    const [adminAUser, adminBUser, driverAUser, candidateUser] = createdUsers;
    ids.profiles.push(adminAUser.id, adminBUser.id, driverAUser.id, candidateUser.id);

    const { error: tenantsError } = await admin.from("tenants").insert([
      { id: tenantA, tenant_id: tenantA, name: `${prefix}-tenant-a` },
      { id: tenantB, tenant_id: tenantB, name: `${prefix}-tenant-b` }
    ]);
    if (tenantsError) throw tenantsError;

    const { error: profilesError } = await admin.from("profiles").insert([
      {
        id: adminAUser.id,
        tenant_id: tenantA,
        display_name: `${prefix}-admin-a`,
        email: adminAEmail,
        role: "admin",
        active: true
      },
      {
        id: adminBUser.id,
        tenant_id: tenantB,
        display_name: `${prefix}-admin-b`,
        email: adminBEmail,
        role: "admin",
        active: true
      },
      {
        id: driverAUser.id,
        tenant_id: tenantA,
        display_name: `${prefix}-driver-a`,
        email: driverAEmail,
        role: "driver",
        active: true
      }
    ]);
    if (profilesError) throw profilesError;

    const busA = await insertOne(admin, "buses", {
      tenant_id: tenantA,
      internal_number: `${prefix}-bus-a`,
      plate: `${prefix}-plate-a`,
      current_km: 100,
      status: "active"
    });
    const busB = await insertOne(admin, "buses", {
      tenant_id: tenantB,
      internal_number: `${prefix}-bus-b`,
      plate: `${prefix}-plate-b`,
      current_km: 200,
      status: "active"
    });
    ids.buses.push(busA, busB);

    const kmA = await insertOne(admin, "km_records", {
      tenant_id: tenantA,
      bus_id: busA,
      bus_label: `${prefix}-bus-a`,
      driver_id: adminAUser.id,
      driver_name: `${prefix}-admin-a`,
      record_date: new Date().toISOString(),
      start_km: 100,
      end_km: 110
    });
    const kmB = await insertOne(admin, "km_records", {
      tenant_id: tenantB,
      bus_id: busB,
      bus_label: `${prefix}-bus-b`,
      driver_id: adminBUser.id,
      driver_name: `${prefix}-admin-b`,
      record_date: new Date().toISOString(),
      start_km: 200,
      end_km: 210
    });
    ids.kmRecords.push(kmA, kmB);

    ids.hourRecords.push(
      await insertOne(admin, "hour_records", { tenant_id: tenantA, bus_id: busA, driver_id: adminAUser.id, notes: `${prefix}-hour-a` }),
      await insertOne(admin, "hour_records", { tenant_id: tenantB, bus_id: busB, driver_id: adminBUser.id, notes: `${prefix}-hour-b` })
    );
    ids.trips.push(
      await insertOne(admin, "trips", { tenant_id: tenantA, bus_id: busA, driver_id: adminAUser.id, origin: `${prefix}-origin-a` }),
      await insertOne(admin, "trips", { tenant_id: tenantB, bus_id: busB, driver_id: adminBUser.id, origin: `${prefix}-origin-b` })
    );
    ids.currentAccounts.push(
      await insertOne(admin, "current_accounts", { tenant_id: tenantA, account_name: `${prefix}-account-a` }),
      await insertOne(admin, "current_accounts", { tenant_id: tenantB, account_name: `${prefix}-account-b` })
    );

    const adminA = await signIn(url, anonKey, adminAEmail, password);
    const driverA = await signIn(url, anonKey, driverAEmail, password);

    const checks = [
      { label: "profiles select aisle tenant", run: () => expectNoForeignRows("profiles select aisle tenant", adminA.from("profiles").select("id").eq("tenant_id", tenantB)) },
      { label: "buses select aisle tenant", run: () => expectNoForeignRows("buses select aisle tenant", adminA.from("buses").select("id").eq("tenant_id", tenantB)) },
      { label: "km_records select aisle tenant", run: () => expectNoForeignRows("km_records select aisle tenant", adminA.from("km_records").select("id").eq("tenant_id", tenantB)) },
      { label: "hour_records select aisle tenant", run: () => expectNoForeignRows("hour_records select aisle tenant", adminA.from("hour_records").select("id").eq("tenant_id", tenantB)) },
      { label: "trips select aisle tenant", run: () => expectNoForeignRows("trips select aisle tenant", adminA.from("trips").select("id").eq("tenant_id", tenantB)) },
      { label: "current_accounts select aisle tenant", run: () => expectNoForeignRows("current_accounts select aisle tenant", adminA.from("current_accounts").select("id").eq("tenant_id", tenantB)) },
      { label: "audit_log select aisle tenant", run: () => expectNoForeignRows("audit_log select aisle tenant", adminA.from("audit_log").select("id").eq("tenant_id", tenantB)) },
      { label: "profiles insert foreign tenant denied", run: () => expectWriteDenied("profiles insert foreign tenant denied", adminA.from("profiles").insert({
        id: candidateUser.id,
        tenant_id: tenantB,
        display_name: `${prefix}-bad-profile`,
        email: candidateEmail,
        role: "driver",
        active: true
      }).select("id")) },
      { label: "buses insert foreign tenant denied", run: () => expectWriteDenied("buses insert foreign tenant denied", adminA.from("buses").insert({
        tenant_id: tenantB,
        internal_number: `${prefix}-bad-bus`,
        plate: `${prefix}-bad-plate`
      }).select("id")) },
      { label: "km_records insert foreign tenant denied", run: () => expectWriteDenied("km_records insert foreign tenant denied", adminA.from("km_records").insert({
        tenant_id: tenantB,
        bus_id: busB,
        bus_label: `${prefix}-bad-km`,
        driver_id: adminAUser.id,
        driver_name: `${prefix}-admin-a`,
        record_date: new Date().toISOString(),
        start_km: 1,
        end_km: 2
      }).select("id")) },
      { label: "hour_records insert foreign tenant denied", run: () => expectWriteDenied("hour_records insert foreign tenant denied", adminA.from("hour_records").insert({
        tenant_id: tenantB,
        bus_id: busB,
        driver_id: adminBUser.id
      }).select("id")) },
      { label: "trips insert foreign tenant denied", run: () => expectWriteDenied("trips insert foreign tenant denied", adminA.from("trips").insert({
        tenant_id: tenantB,
        bus_id: busB,
        driver_id: adminBUser.id,
        origin: `${prefix}-bad-trip`
      }).select("id")) },
      { label: "current_accounts insert foreign tenant denied", run: () => expectWriteDenied("current_accounts insert foreign tenant denied", adminA.from("current_accounts").insert({
        tenant_id: tenantB,
        account_name: `${prefix}-bad-account`
      }).select("id")) },
      { label: "buses update foreign tenant denied", run: () => expectWriteDenied("buses update foreign tenant denied", adminA.from("buses").update({ plate: `${prefix}-stolen` }).eq("id", busB).select("id")) },
      { label: "current_accounts delete foreign tenant denied", run: () => expectWriteDenied("current_accounts delete foreign tenant denied", adminA.from("current_accounts").delete().eq("id", ids.currentAccounts[1]).select("id")) },
      { label: "non-admin cannot create buses", run: () => expectWriteDenied("non-admin cannot create buses", driverA.from("buses").insert({
        tenant_id: tenantA,
        internal_number: `${prefix}-driver-bus`,
        plate: `${prefix}-driver-plate`
      }).select("id")) },
      { label: "non-admin cannot create profiles", run: () => expectWriteDenied("non-admin cannot create profiles", driverA.from("profiles").insert({
        id: candidateUser.id,
        tenant_id: tenantA,
        display_name: `${prefix}-driver-profile`,
        email: candidateEmail,
        role: "driver",
        active: true
      }).select("id")) }
    ];

    for (const check of checks) {
      try {
        await check.run();
      } catch (error) {
        ok = fail(check.label, error);
      }
    }
  } finally {
    const cleanupOk = await cleanup(admin, ids, authUserIds);
    ok = ok && cleanupOk;
  }

  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAIL verify:rls: ${error.message ?? String(error)}`);
  process.exitCode = 1;
});
