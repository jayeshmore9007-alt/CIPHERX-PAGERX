/**
 * PAGERX Commander connection profile and safe reachability probe.
 *
 * This module intentionally does not implement SSH or arbitrary shell commands.
 * The Pager management origin must be entered and verified by the owner.
 */
export type PagerConnectionKind = "usb-ethernet" | "trusted-wifi";

export type PagerConnectionProfile = {
  host: string;
  port: number;
  scheme: "http" | "https";
  kind: PagerConnectionKind;
  virtualPagerPath: string;
};

export type PagerReachability = {
  reachable: boolean;
  checkedAt: string;
  elapsedMs: number;
  url: string;
  message: string;
};

const isPrivateHost = (host: string): boolean => {
  const value = host.trim().toLowerCase();
  if (value === "localhost" || value.endsWith(".local")) return true;
  if (/^10\.(\d{1,3}\.){2}\d{1,3}$/.test(value)) return true;
  if (/^192\.168\.(\d{1,3}\.)\d{1,3}$/.test(value)) return true;
  const match = value.match(/^172\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (match) {
    const second = Number(match[1]);
    return second >= 16 && second <= 31;
  }
  return false;
};

export const validatePagerProfile = (
  profile: PagerConnectionProfile,
): string[] => {
  const errors: string[] = [];
  const host = profile.host.trim();

  if (!host) errors.push("Enter the Pager host or IP address.");
  if (!isPrivateHost(host)) {
    errors.push("Use a private/local address for the Pager connection.");
  }
  if (!Number.isInteger(profile.port) || profile.port < 1 || profile.port > 65535) {
    errors.push("Port must be between 1 and 65535.");
  }
  if (!profile.virtualPagerPath.startsWith("/")) {
    errors.push("Virtual Pager path must start with '/'.");
  }
  if (profile.virtualPagerPath.includes("..")) {
    errors.push("Virtual Pager path cannot contain path traversal.");
  }
  return errors;
};

export const buildPagerUrl = (
  profile: PagerConnectionProfile,
): string => {
  const errors = validatePagerProfile(profile);
  if (errors.length) throw new Error(errors.join(" "));
  const host = profile.host.trim().replace(/^\[|\]$/g, "");
  const path = profile.virtualPagerPath.startsWith("/")
    ? profile.virtualPagerPath
    : `/${profile.virtualPagerPath}`;
  return `${profile.scheme}://${host}:${profile.port}${path}`;
};

/**
 * A lightweight HTTP reachability test only. This does not authenticate,
 * parse HTML, scrape the Virtual Pager, or trigger any Pager operation.
 */
export const testPagerReachability = async (
  profile: PagerConnectionProfile,
  timeoutMs = 5000,
): Promise<PagerReachability> => {
  const url = buildPagerUrl(profile);
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    return {
      reachable: response.status > 0,
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      url,
      message: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      reachable: false,
      checkedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      url,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  } finally {
    clearTimeout(timeout);
  }
};
