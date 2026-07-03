export class AppTimestamp {
  private readonly value: Date;

  private constructor(value: Date) {
    this.value = value;
  }

  static fromDate(value: Date): AppTimestamp {
    return new AppTimestamp(value);
  }

  static fromMillis(value: number): AppTimestamp {
    return new AppTimestamp(new Date(value));
  }

  static fromISOString(value: string): AppTimestamp {
    return new AppTimestamp(new Date(value));
  }

  toDate(): Date {
    return this.value;
  }

  toMillis(): number {
    return this.value.getTime();
  }

  toISOString(): string {
    return this.value.toISOString();
  }
}
