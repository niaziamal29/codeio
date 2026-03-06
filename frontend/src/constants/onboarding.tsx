import { I18nKey } from "#/i18n/declaration";

type QuestionType = "input" | "single" | "multi";

export interface OnboardingForm {
  app_mode: ("oss" | "saas")[];
  type: QuestionType;
  questionKey: I18nKey;
  subtitleKey?: I18nKey;
  answerOptions?: { key: I18nKey; id: string }[];
  inputOptions?: { key: I18nKey; id: string }[];
}

export const ONBOARDING_FORM: OnboardingForm[] = [
  {
    type: "input",
    app_mode: ["oss"],
    questionKey: I18nKey.ONBOARDING$ORG_NAME_QUESTION,
    inputOptions: [
      { key: I18nKey.ONBOARDING$ORG_NAME_INPUT_NAME, id: "org_name" },
      { key: I18nKey.ONBOARDING$ORG_NAME_INPUT_DOMAIN, id: "org_domain" },
    ],
  },
  {
    type: "single",
    app_mode: ["oss", "saas"],
    questionKey: I18nKey.ONBOARDING$ORG_SIZE_QUESTION,
    subtitleKey: I18nKey.ONBOARDING$ORG_SIZE_SUBTITLE,
    answerOptions: [
      { key: I18nKey.ONBOARDING$ORG_SIZE_SOLO, id: "solo" },
      { key: I18nKey.ONBOARDING$ORG_SIZE_2_10, id: "org_2_10" },
      { key: I18nKey.ONBOARDING$ORG_SIZE_11_50, id: "org_11_50" },
      { key: I18nKey.ONBOARDING$ORG_SIZE_51_200, id: "org_51_200" },
      { key: I18nKey.ONBOARDING$ORG_SIZE_200_PLUS, id: "org_200_plus" },
    ],
  },
  {
    type: "multi",
    app_mode: ["oss", "saas"],
    questionKey: I18nKey.ONBOARDING$USE_CASE_QUESTION,
    subtitleKey: I18nKey.ONBOARDING$USE_CASE_SUBTITLE,
    answerOptions: [
      { key: I18nKey.ONBOARDING$USE_CASE_NEW_FEATURES, id: "new_features" },
      {
        key: I18nKey.ONBOARDING$USE_CASE_APP_FROM_SCRATCH,
        id: "app_from_scratch",
      },
      { key: I18nKey.ONBOARDING$USE_CASE_FIXING_BUGS, id: "fixing_bugs" },
      { key: I18nKey.ONBOARDING$USE_CASE_REFACTORING, id: "refactoring" },
      {
        key: I18nKey.ONBOARDING$USE_CASE_AUTOMATING_TASKS,
        id: "automating_tasks",
      },
      { key: I18nKey.ONBOARDING$USE_CASE_NOT_SURE, id: "not_sure" },
    ],
  },
  {
    type: "single",
    app_mode: ["saas"],
    questionKey: I18nKey.ONBOARDING$ROLE_QUESTION,
    answerOptions: [
      {
        key: I18nKey.ONBOARDING$ROLE_SOFTWARE_ENGINEER,
        id: "software_engineer",
      },
      {
        key: I18nKey.ONBOARDING$ROLE_ENGINEERING_MANAGER,
        id: "engineering_manager",
      },
      { key: I18nKey.ONBOARDING$ROLE_CTO_FOUNDER, id: "cto_founder" },
      {
        key: I18nKey.ONBOARDING$ROLE_PRODUCT_OPERATIONS,
        id: "product_operations",
      },
      { key: I18nKey.ONBOARDING$ROLE_STUDENT_HOBBYIST, id: "student_hobbyist" },
      { key: I18nKey.ONBOARDING$ROLE_OTHER, id: "other" },
    ],
  },
];
