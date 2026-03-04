import { ReactNode } from "react";
import { Card } from "#/ui/card";
import { CardTitle } from "#/ui/card-title";
import { Typography } from "#/ui/typography";
import { BrandButton } from "#/components/features/settings/brand-button";

interface CTAButton {
  label: string;
  variant: "primary" | "secondary";
  onClick?: () => void;
}

interface HomepageCTAProps {
  title: string;
  description: string;
  icon?: ReactNode;
  buttons: CTAButton[];
  className?: string;
}

export function HomepageCTA({
  title,
  description,
  icon,
  buttons,
  className,
}: HomepageCTAProps) {
  return (
    <Card
      border="default"
      className={`w-[342px] h-[445px] rounded-[12px] flex-col p-5 ${className ?? ""}`}
    >
      <CardTitle icon={icon}>{title}</CardTitle>

      <Typography.Text>{description}</Typography.Text>

      <div className="flex gap-3 mt-auto">
        {buttons.map((button) => (
          <BrandButton
            key={button.label}
            variant={button.variant}
            type="button"
            onClick={button.onClick}
          >
            {button.label}
          </BrandButton>
        ))}
      </div>
    </Card>
  );
}
