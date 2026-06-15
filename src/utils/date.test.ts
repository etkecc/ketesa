import { dateFormatter, dateParser, getTimeSince, getTimeUntil, normalizeTS } from "./date";

describe("normalizeTS", () => {
  it("converts second-based unix timestamps to milliseconds", () => {
    expect(normalizeTS(1560432506)).toBe(1560432506000);
  });

  it("keeps millisecond-based unix timestamps unchanged", () => {
    expect(normalizeTS(1560432668000)).toBe(1560432668000);
  });

  it("returns null and undefined unchanged", () => {
    expect(normalizeTS(null)).toBeNull();
    expect(normalizeTS(undefined)).toBeUndefined();
  });
});

describe("dateParser", () => {
  it("parses a date string to a numeric timestamp", () => {
    const ts = dateParser("2020-01-01T00:00:00.000Z");
    expect(typeof ts).toBe("number");
    expect(ts).toBe(new Date("2020-01-01T00:00:00.000Z").getTime());
  });

  it("accepts a numeric timestamp and returns it unchanged", () => {
    const now = Date.now();
    expect(dateParser(now)).toBe(now);
  });

  it("accepts a Date object", () => {
    const d = new Date(0);
    expect(dateParser(d)).toBe(0);
  });
});

describe("dateFormatter", () => {
  it("returns empty string for null", () => {
    expect(dateFormatter(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(dateFormatter(undefined)).toBe("");
  });

  it("formats a Date object to yyyy-MM-ddThh:mm", () => {
    // Use a fixed UTC date and derive expected local parts to avoid TZ drift
    const d = new Date(2024, 2, 15, 10, 30); // local time 2024-03-15 10:30
    const pad = (n: number) => n.toString().padStart(2, "0");
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    expect(dateFormatter(d)).toBe(expected);
  });

  it("formats a timestamp number", () => {
    const d = new Date(2024, 0, 1, 8, 5); // 2024-01-01 08:05
    const result = dateFormatter(d.getTime());
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("formats a date string", () => {
    const result = dateFormatter("2024-06-15T12:00:00.000Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe("getTimeSince", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setNow = (date: Date) => vi.setSystemTime(date);

  const past = (minutesAgo: number): string => {
    const d = new Date(Date.now() - minutesAgo * 60 * 1000);
    return d
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "");
  };

  it("returns less_than_minute when diff < 1 min", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(0));
    expect(result.timeI18Nkey).toBe("etkecc.time.less_than_minute");
    expect(result.timeI18Nparams).toEqual({});
  });

  it("returns minutes with smart_count 1 when diff === 1 min", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(1));
    expect(result.timeI18Nkey).toBe("etkecc.time.minutes");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns minutes with correct count when diff < 60 min", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(30));
    expect(result.timeI18Nkey).toBe("etkecc.time.minutes");
    expect(result.timeI18Nparams).toEqual({ smart_count: 30 });
  });

  it("returns hours with smart_count 1 when diff is 60–119 min", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(90));
    expect(result.timeI18Nkey).toBe("etkecc.time.hours");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns hours with correct count when diff < 24h", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(6 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.hours");
    expect(result.timeI18Nparams).toEqual({ smart_count: 6 });
  });

  it("returns days with smart_count 1 when diff is 24–47h", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(36 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.days");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns days with correct count when diff < 7 days", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(5 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.days");
    expect(result.timeI18Nparams).toEqual({ smart_count: 5 });
  });

  it("returns weeks with smart_count 1 when diff is 7–13 days", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(10 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.weeks");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns weeks with correct count when diff < 30 days", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(21 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.weeks");
    expect(result.timeI18Nparams).toEqual({ smart_count: 3 });
  });

  it("returns months with smart_count 1 when diff is 30–59 days", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(45 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.months");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns months with correct count when diff >= 60 days", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(90 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.months");
    expect(result.timeI18Nparams).toEqual({ smart_count: 3 });
  });

  it("appends Z to date strings without timezone suffix", () => {
    setNow(new Date("2024-01-01T12:01:00Z"));
    // "2024-01-01 12:00:00" has no Z; should be treated as UTC
    const result = getTimeSince("2024-01-01 12:00:00");
    expect(result.timeI18Nkey).toBe("etkecc.time.minutes");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("handles overdue dates (past, > 1 month)", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(45 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.months");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("handles overdue dates (past, > 2 months)", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeSince(past(75 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.months");
    expect(result.timeI18Nparams).toEqual({ smart_count: 2 });
  });
});

describe("getTimeUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setNow = (date: Date) => vi.setSystemTime(date);

  const future = (minutesFromNow: number): string => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    return d.toISOString();
  };

  it("returns less_than_minute when diff < 1 min", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil(future(0));
    expect(result.timeI18Nkey).toBe("etkecc.time.less_than_minute");
    expect(result.timeI18Nparams).toEqual({});
  });

  it("returns minutes with smart_count 1 when diff === 1 min", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil(future(1));
    expect(result.timeI18Nkey).toBe("etkecc.time.minutes");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns minutes with correct count when diff < 60 min", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil(future(30));
    expect(result.timeI18Nkey).toBe("etkecc.time.minutes");
    expect(result.timeI18Nparams).toEqual({ smart_count: 30 });
  });

  it("returns hours with smart_count 1 when diff is 60–119 min", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil(future(90));
    expect(result.timeI18Nkey).toBe("etkecc.time.hours");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns days with smart_count 1 when diff is 24–47h", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil(future(36 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.days");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns days with correct count when diff < 7 days", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil(future(5 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.days");
    expect(result.timeI18Nparams).toEqual({ smart_count: 5 });
  });

  it("returns weeks with smart_count 1 when diff is 7–13 days", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil(future(10 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.weeks");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns months with smart_count 1 when diff is 30–59 days", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil(future(45 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.months");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });

  it("returns months with correct count when diff >= 60 days", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil(future(90 * 24 * 60));
    expect(result.timeI18Nkey).toBe("etkecc.time.months");
    expect(result.timeI18Nparams).toEqual({ smart_count: 3 });
  });

  it("returns less_than_minute for a past date (due_at already passed)", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    // date 1 minute in the past → diff is negative, resolves to first bucket
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
    const result = getTimeUntil(pastDate);
    expect(result.timeI18Nkey).toBe("etkecc.time.less_than_minute");
  });

  it("appends Z to date strings without timezone suffix", () => {
    setNow(new Date("2024-01-01T12:00:00Z"));
    const result = getTimeUntil("2024-01-01 12:01:00");
    expect(result.timeI18Nkey).toBe("etkecc.time.minutes");
    expect(result.timeI18Nparams).toEqual({ smart_count: 1 });
  });
});
