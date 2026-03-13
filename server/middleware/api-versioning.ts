import type { Request, Response, NextFunction, Router } from "express";

export type ApiVersion = "v1" | "v2";

export interface VersionedRoute {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  versions: Partial<Record<ApiVersion, (req: Request, res: Response, next: NextFunction) => void>>;
}

const SUPPORTED_VERSIONS: ApiVersion[] = ["v1", "v2"];
const CURRENT_VERSION: ApiVersion = "v1";
const DEPRECATED_VERSIONS: ApiVersion[] = [];
const SUNSET_DATES: Partial<Record<ApiVersion, string>> = {
  v1: "2026-09-01",
};

function resolveVersion(req: Request): ApiVersion {
  const headerVersion = req.headers["x-api-version"] as string | undefined;
  const queryVersion = req.query.apiVersion as string | undefined;
  const pathVersion = req.path.match(/^\/(v\d+)\//)?.[1];

  const raw = headerVersion || queryVersion || pathVersion || CURRENT_VERSION;
  const normalized = raw.toLowerCase() as ApiVersion;

  if (SUPPORTED_VERSIONS.includes(normalized)) return normalized;
  return CURRENT_VERSION;
}

export function versionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const version = resolveVersion(req);
  (req as Request & { apiVersion: ApiVersion }).apiVersion = version;

  res.setHeader("X-API-Version", version);
  res.setHeader("X-API-Supported-Versions", SUPPORTED_VERSIONS.join(", "));

  if (DEPRECATED_VERSIONS.includes(version)) {
    res.setHeader("Deprecation", "true");
    const sunset = SUNSET_DATES[version];
    if (sunset) res.setHeader("Sunset", sunset);
    res.setHeader(
      "Link",
      `</api/${CURRENT_VERSION}>; rel="successor-version"`
    );
  }

  next();
}

export function registerVersionedRoute(router: Router, route: VersionedRoute): void {
  const { method, path, versions } = route;

  router[method](path, (req: Request, res: Response, next: NextFunction) => {
    const version = (req as Request & { apiVersion: ApiVersion }).apiVersion || CURRENT_VERSION;

    const handler =
      versions[version] ||
      versions[CURRENT_VERSION] ||
      versions[SUPPORTED_VERSIONS.find((v) => versions[v]) as ApiVersion];

    if (!handler) {
      res.status(501).json({
        error: "Not Implemented",
        message: `Route ${method.toUpperCase()} ${path} is not available in API version ${version}`,
        supportedVersions: SUPPORTED_VERSIONS.filter((v) => versions[v]),
      });
      return;
    }

    handler(req, res, next);
  });
}

export function buildVersionedResponse<T>(
  data: T,
  version: ApiVersion,
  meta?: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    apiVersion: version,
    timestamp:
      version === "v2"
        ? Date.now()
        : new Date().toISOString(),
    data,
  };

  if (meta && Object.keys(meta).length > 0) {
    base.meta = meta;
  }

  if (version === "v2") {
    base.schema = "2.0";
  }

  return base;
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  version: ApiVersion = CURRENT_VERSION
): Record<string, unknown> {
  const totalPages = Math.ceil(total / pageSize);

  return buildVersionedResponse(items, version, {
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

export function deprecationNotice(version: ApiVersion): string | null {
  if (!DEPRECATED_VERSIONS.includes(version)) return null;
  const sunset = SUNSET_DATES[version];
  return sunset
    ? `API version ${version} is deprecated and will be removed on ${sunset}. Please migrate to ${CURRENT_VERSION}.`
    : `API version ${version} is deprecated. Please migrate to ${CURRENT_VERSION}.`;
}

export { SUPPORTED_VERSIONS, CURRENT_VERSION, DEPRECATED_VERSIONS, SUNSET_DATES };
