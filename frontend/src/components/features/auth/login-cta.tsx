import { useTranslation } from "react-i18next";
import { CardTitle } from "#/ui/card-title";
import { Typography } from "#/ui/typography";
import { BrandButton } from "../settings/brand-button";
import { I18nKey } from "#/i18n/declaration";

interface LoginCTAProps {
  className?: string;
}

export function LoginCTA({ className }: LoginCTAProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`w-[286px] h-full rounded-[6px] border border-[#24242499] flex flex-col ${className ?? ""}`}
      style={{
        background: `linear-gradient(0deg, rgba(10, 10, 10, 0.5), rgba(10, 10, 10, 0.5)), radial-gradient(237.19% 96.24% at 53.77% -1.6%, rgba(255, 255, 255, 0.14) 0%, rgba(0, 0, 0, 0) 55%)`,
      }}
      data-testid="login-cta"
    >
      {/* CTA inner container */}
      <div className="w-[270px] h-[332px] flex flex-col gap-[11px] mt-[25px] ml-[25px]">
        {/* Card title */}
        <CardTitle>{t(I18nKey.CTA$ENTERPRISE_TITLE)}</CardTitle>

        {/* Description */}
        <Typography.Text className="text-[#8C8C8C] font-inter font-normal text-[14px] leading-[20px]">
          {t(I18nKey.CTA$ENTERPRISE_DESCRIPTION)}
        </Typography.Text>

        {/* Feature list */}
        <ul className="text-[#8C8C8C] font-inter font-normal text-[14px] leading-[20px] list-disc list-inside flex flex-col gap-1">
          <li>{t(I18nKey.CTA$FEATURE_ON_PREMISES)}</li>
          <li>{t(I18nKey.CTA$FEATURE_DATA_CONTROL)}</li>
          <li>{t(I18nKey.CTA$FEATURE_COMPLIANCE)}</li>
          <li>{t(I18nKey.CTA$FEATURE_SUPPORT)}</li>
        </ul>

        <div className="h-[40px] flex justify-start mt-auto">
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
