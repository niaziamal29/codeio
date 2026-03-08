import {
  Settings,
  SettingsFieldSchema,
  SettingsSchema,
  SettingsSectionSchema,
  SettingsValue,
} from "#/types/settings";

export type SettingsFormValues = Record<string, string | boolean>;
export type SettingsDirtyState = Record<string, boolean>;

function getSchemaFields(schema: SettingsSchema): SettingsFieldSchema[] {
  return schema.sections.flatMap((section) => section.fields);
}

export type SdkSettingsPayload = Record<string, SettingsValue>;

function getCurrentSettingValue(
  settings: Settings,
  key: string,
): SettingsValue {
  return settings.sdk_settings_values?.[key] ?? null;
}

function normalizeFieldValue(
  field: SettingsFieldSchema,
  rawValue: unknown,
): string | boolean {
  if (field.widget === "boolean") {
    return Boolean(rawValue ?? field.default ?? false);
  }

  const resolvedValue = rawValue ?? field.default;
  if (resolvedValue === null || resolvedValue === undefined) {
    return "";
  }

  return String(resolvedValue);
}

function normalizeComparableValue(
  field: SettingsFieldSchema,
  rawValue: unknown,
): boolean | number | string | null {
  if (rawValue === undefined) {
    return null;
  }

  if (field.widget === "boolean") {
    return Boolean(rawValue);
  }

  if (field.widget === "number") {
    if (rawValue === "" || rawValue === null) {
      return null;
    }

    const parsedValue =
      typeof rawValue === "number" ? rawValue : Number(String(rawValue));
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  if (rawValue === null) {
    return null;
  }

  return String(rawValue);
}

export function buildInitialSettingsFormValues(
  settings: Settings,
): SettingsFormValues {
  const schema = settings.sdk_settings_schema;
  if (!schema) {
    return {};
  }

  return Object.fromEntries(
    getSchemaFields(schema).map((field) => [
      field.key,
      normalizeFieldValue(field, getCurrentSettingValue(settings, field.key)),
    ]),
  );
}

export function hasAdvancedSettingsOverrides(settings: Settings): boolean {
  const schema = settings.sdk_settings_schema;
  if (!schema) {
    return false;
  }

  return getSchemaFields(schema).some((field) => {
    if (!field.advanced) {
      return false;
    }

    const currentValue = getCurrentSettingValue(settings, field.key);

    return (
      normalizeComparableValue(field, currentValue ?? field.default ?? null) !==
      normalizeComparableValue(field, field.default ?? null)
    );
  });
}

export function isSettingsFieldVisible(
  field: SettingsFieldSchema,
  values: SettingsFormValues,
): boolean {
  return field.depends_on.every((dependency) => values[dependency] === true);
}

function coerceFieldValue(
  field: SettingsFieldSchema,
  rawValue: string | boolean,
): boolean | number | string | null {
  if (field.widget === "boolean") {
    return Boolean(rawValue);
  }

  if (field.widget === "number") {
    const stringValue = String(rawValue).trim();
    if (!stringValue) {
      return null;
    }

    return Number(stringValue);
  }

  const stringValue = String(rawValue);
  if (stringValue === "" && field.widget !== "password") {
    return null;
  }

  return stringValue;
}

export function buildSdkSettingsPayload(
  schema: SettingsSchema,
  values: SettingsFormValues,
  dirty: SettingsDirtyState,
): SdkSettingsPayload {
  const payload: SdkSettingsPayload = {};

  for (const field of getSchemaFields(schema)) {
    if (dirty[field.key]) {
      payload[field.key] = coerceFieldValue(field, values[field.key]);
    }
  }

  return payload;
}

export function getVisibleSettingsSections(
  schema: SettingsSchema,
  values: SettingsFormValues,
  showAdvanced: boolean,
): SettingsSectionSchema[] {
  return schema.sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter(
        (field) =>
          (showAdvanced || !field.advanced) &&
          isSettingsFieldVisible(field, values),
      ),
    }))
    .filter((section) => section.fields.length > 0);
}
