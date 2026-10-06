import type {
  Metadata,
  Viewport,
} from "next";
import type {
  ReactNode,
} from "react";

import "vazirmatn/Vazirmatn-font-face.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default:
      "تولیدی باقری",
    template:
      "%s | تولیدی باقری",
  },
  description:
    "سامانه مدیریت تولید، پرسنل و حسابداری تولیدی باقری",
};

export const viewport: Viewport = {
  width:
    "device-width",
  initialScale:
    1,
  viewportFit:
    "cover",
  themeColor:
    "#102827",
};

export default function RootLayout({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
    >
      <body>
        {children}
      </body>
    </html>
  );
}