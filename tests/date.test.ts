import { formatDate, getCurrentDate } from "../src/utils/date";

describe("Date Utils", () => {
  describe("formatDate", () => {
    it("should format date correctly", () => {
      const testDate = new Date("2024-01-15T10:30:00Z");
      const formatted = formatDate(testDate);
      expect(formatted).toBe("2024.01.15 10:30");
    });

    it("should format date with different timezone correctly", () => {
      const testDate = new Date("2024-12-31T23:59:59Z");
      const formatted = formatDate(testDate);
      expect(formatted).toBe("2024.12.31 23:59");
    });

    it("should handle date with milliseconds", () => {
      const testDate = new Date("2024-06-15T14:30:45.123Z");
      const formatted = formatDate(testDate);
      expect(formatted).toBe("2024.06.15 14:30");
    });
  });

  describe("getCurrentDate", () => {
    it("should return current date in correct format", () => {
      const current = getCurrentDate();
      expect(current).toMatch(/^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/);
    });

    it("should use formatDate function internally", () => {
      const now = new Date();
      const expected = formatDate(now);

      const originalDate = global.Date;
      global.Date = jest.fn(() => now) as unknown as typeof Date;

      const result = getCurrentDate();
      expect(result).toBe(expected);

      global.Date = originalDate;
    });
  });
});
