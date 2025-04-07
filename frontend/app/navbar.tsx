import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { Kbd } from "@heroui/kbd";
import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  GithubIcon,
  HeartFilledIcon,
  SearchIcon,
  Logo,
} from "@/components/icons";
import { title, subtitle } from "@/components/primitives";

export const Navbar = () => {
  return (
    <HeroUINavbar className="h-12" maxWidth="full" position="sticky">
      <NavbarContent
        className="hidden h-12 sm:flex basis-3/5 sm:basis-full"
        justify="center"
      >
        <NavbarItem className="hidden sm:flex">
          {" "}
          <div className="flex flex-row items-center">
            <span className={title({ size: "sm", color: "violet" })}>
              窝窝腚儿&nbsp;
            </span>
            <span className="text-md">来自爱你的德儿🦉🍃&nbsp;</span>
          </div>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="sm:flex gap-2">
          <Link isExternal aria-label="Github" href={siteConfig.links.github}>
            <GithubIcon className="text-default-500" />
          </Link>
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  );
};
