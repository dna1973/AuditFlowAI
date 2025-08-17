import { Building2, LayoutDashboard, FileText, Settings, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { User } from "@shared/schema";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Condomínios",
    href: "/condominiums",
    icon: Building2,
  },
  {
    name: "Relatórios",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "Configurações",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white/10 dark:bg-black/20 backdrop-blur-lg border-r border-white/20 dark:border-gray-700/50 z-50">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-verde-accent rounded-lg flex items-center justify-center mr-3 shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold">AuditFlow</h1>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg transition-all duration-200",
                    isActive
                      ? "text-verde-accent bg-verde-accent/10"
                      : "text-gray-600 dark:text-gray-300 hover:text-verde-accent hover:bg-verde-accent/10"
                  )}
                  data-testid={`link-${item.name.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center p-3 bg-white/10 dark:bg-black/20 rounded-lg">
          <div className="w-10 h-10 bg-verde-accent rounded-full flex items-center justify-center mr-3">
            <span className="text-white font-semibold text-sm">
              {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm" data-testid="text-username">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || 'Usuário'
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Administrador
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
