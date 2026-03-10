import { useTranslation } from "react-i18next";
import { CardTitle } from "#/ui/card-title";
import { Typography } from "#/ui/typography";
import { BrandButton } from "../settings/brand-button";
import { I18nKey } from "#/i18n/declaration";
import StackedIcon from "#/icons/stacked.svg?react";

export function LoginCTA() {
  const { t } = useTranslation();

  return (
    <div
      className="w-[320px] h-auto rounded-[16px] flex flex-col border border-[#24242499]"
      style={{
        background:
          "linear-gradient(0deg, rgba(10, 10, 10, 0.5), rgba(10, 10, 10, 0.5)), radial-gradient(80% 60% at 50% 0%, rgba(255, 255, 255, 0.25) 0%, rgba(0, 0, 0, 0) 100%)",
        boxShadow: "0px 4px 6px -4px #0000001A, 0px 10px 15px -3px #0000001A",
      }}
      data-testid="login-cta"
    >
      <div className="w-[270px] flex flex-col gap-[11px] mt-[25px] ml-[25px]">
        <div className="w-[40px] h-[40px]">
          <StackedIcon width={40} height={40} />
        </div>

        <CardTitle>{t(I18nKey.CTA$ENTERPRISE_TITLE)}</CardTitle>

        <Typography.Text className="text-[#8C8C8C] font-inter font-normal text-[14px] leading-[20px]">
          {t(I18nKey.CTA$ENTERPRISE_DESCRIPTION)}
        </Typography.Text>

        <ul className="text-[#8C8C8C] font-inter font-normal text-[14px] leading-[20px] list-disc list-inside flex flex-col gap-1">
          <li>{t(I18nKey.CTA$FEATURE_ON_PREMISES)}</li>
          <li>{t(I18nKey.CTA$FEATURE_DATA_CONTROL)}</li>
          <li>{t(I18nKey.CTA$FEATURE_COMPLIANCE)}</li>
          <li>{t(I18nKey.CTA$FEATURE_SUPPORT)}</li>
        </ul>

        <div className="h-[40px] flex justify-start">
          <BrandButton
            variant="primary"
            type="button"
            className="w-[111px] h-[40px] rounded-[4px] bg-[#050505] border border-[#242424] text-white hover:bg-[#0a0a0a]"
          >
            {t(I18nKey.CTA$LEARN_MORE)}
          </BrandButton>
        </div>
      </div>
    </div>
  );
}
