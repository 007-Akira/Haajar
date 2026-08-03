const UUID_SEGMENT = "[^/]+";

export function resolveBackFallback(pathname: string): string | null {
  const scannerOrManual = pathname.match(
    new RegExp(
      `^/events/(${UUID_SEGMENT})/groups/(${UUID_SEGMENT})/roll-calls/(${UUID_SEGMENT})/(?:scanner|manual)$`
    )
  );
  if (scannerOrManual) {
    return `/events/${scannerOrManual[1]}/groups/${scannerOrManual[2]}/roll-calls/${scannerOrManual[3]}`;
  }

  const generalChild = pathname.match(
    new RegExp(
      `^/events/(${UUID_SEGMENT})/attendance/general/(${UUID_SEGMENT})/(?:scanner|manual|volunteers)$`
    )
  );
  if (generalChild) {
    return `/events/${generalChild[1]}/attendance/general/${generalChild[2]}`;
  }

  const groupChild = pathname.match(
    new RegExp(`^/events/(${UUID_SEGMENT})/groups/(${UUID_SEGMENT})/(?:.+)$`)
  );
  if (groupChild) {
    return `/events/${groupChild[1]}/groups/${groupChild[2]}`;
  }

  const group = pathname.match(new RegExp(`^/events/(${UUID_SEGMENT})/groups/(${UUID_SEGMENT})$`));
  if (group) {
    return `/events/${group[1]}`;
  }

  const eventChild = pathname.match(new RegExp(`^/events/(${UUID_SEGMENT})/.+$`));
  if (eventChild) {
    return `/events/${eventChild[1]}`;
  }

  if (/^\/events\/[^/]+$/.test(pathname)) return "/";
  if (/^\/join(?:\/[^/]+)?$/.test(pathname)) return "/groups";
  if (/^\/group-requests\/[^/]+$/.test(pathname)) return "/groups";
  if (pathname === "/groups" || pathname === "/notifications" || pathname === "/profile") {
    return "/";
  }

  return null;
}
