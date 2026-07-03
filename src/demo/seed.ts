// DEMO_ONLY
// REMOVE_BEFORE_PRODUCTION

import { AppTimestamp } from "@/lib/datetime";
import type { AppUser, Bus, KmRecord, Tenant } from "@/lib/types";

const createdAt = AppTimestamp.fromDate(new Date("2026-07-01T12:00:00"));
const updatedAt = createdAt;

export const demoCredentials = [
  { uid: "demo-admin", email: "admin@demo.local", password: "admin123" },
  { uid: "demo-supervisor", email: "supervisor@demo.local", password: "supervisor123" },
  { uid: "demo-chofer", email: "chofer@demo.local", password: "chofer123" },
  { uid: "demo-lectura", email: "lectura@demo.local", password: "lectura123" } 
];

export const demoSeed: {
  tenants: Tenant[];
  users: AppUser[];
  buses: Bus[];
  kmRecords: KmRecord[];
  futureEntities: Record<string, unknown[]>;
} = {
  tenants: [
    {
      id: "demo-tenant",
      name: "Empresa Demo",
      rut: "210000000018",
      address: "Av. 18 de Julio 1234, Montevideo",
      contactEmail: "operaciones@demo.local",
      createdAt,
      updatedAt
    }
  ],
  users: [
    {
      id: "demo-admin",
      tenantId: "demo-tenant",
      displayName: "Admin Demo",
      email: "admin@demo.local",
      role: "admin",
      active: true,
      createdAt,
      updatedAt
    },
    {
      id: "demo-supervisor",
      tenantId: "demo-tenant",
      displayName: "Supervisor Demo",
      email: "supervisor@demo.local",
      role: "supervisor",
      active: true,
      createdAt,
      updatedAt
    },
    {
      id: "demo-chofer",
      tenantId: "demo-tenant",
      displayName: "Chofer Demo",
      email: "chofer@demo.local",
      role: "driver",
      active: true,
      createdAt,
      updatedAt
    },
    {
      id: "demo-lectura",
      tenantId: "demo-tenant",
      displayName: "Lectura Demo",
      email: "lectura@demo.local",
      role: "readonly",
      active: true,
      createdAt,
      updatedAt
    }
  ],
  buses: [
    {
      id: "bus-101",
      tenantId: "demo-tenant",
      internalNumber: "101",
      plate: "STM 101",
      brand: "Mercedes-Benz",
      model: "OF 1721",
      year: 2019,
      currentKm: 182450,
      status: "active",
      createdAt,
      updatedAt
    },
    {
      id: "bus-205",
      tenantId: "demo-tenant",
      internalNumber: "205",
      plate: "STM 205",
      brand: "Volvo",
      model: "B270F",
      year: 2021,
      currentKm: 126870,
      status: "active",
      createdAt,
      updatedAt
    },
    {
      id: "bus-312",
      tenantId: "demo-tenant",
      internalNumber: "312",
      plate: "STM 312",
      brand: "Scania",
      model: "K250",
      year: 2018,
      currentKm: 244300,
      status: "maintenance",
      createdAt,
      updatedAt
    }
  ],
  kmRecords: [
    {
      id: "km-1",
      tenantId: "demo-tenant",
      busId: "bus-101",
      busLabel: "101 - STM 101",
      driverId: "demo-chofer",
      driverName: "Chofer Demo",
      date: AppTimestamp.fromDate(new Date("2026-07-01T12:00:00")),
      startKm: 182300,
      endKm: 182450,
      totalKm: 150,
      route: "Montevideo - Canelones",
      notes: "Servicio normal",
      createdAt,
      updatedAt
    },
    {
      id: "km-2",
      tenantId: "demo-tenant",
      busId: "bus-205",
      busLabel: "205 - STM 205",
      driverId: "demo-supervisor",
      driverName: "Supervisor Demo",
      date: AppTimestamp.fromDate(new Date("2026-07-02T12:00:00")),
      startKm: 126760,
      endKm: 126870,
      totalKm: 110,
      route: "Urbano línea 7",
      notes: "",
      createdAt,
      updatedAt
    }
  ],
  futureEntities: {}
};
