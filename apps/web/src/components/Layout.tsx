import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ClipboardList, Briefcase, Users,
  FolderOpen, Menu, X, Building2, ChevronDown, ChevronRight,
  AlertTriangle, CheckSquare, FileText, Shield, Stethoscope,
  BookOpen, Calendar, LogOut, Settings, UserCircle, Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/auth-web";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  baseHref: string;
}

const nr1Group: NavGroup = {
  label: "NR-1 Psicossocial",
  icon: <Shield className="h-4 w-4" />,
  baseHref: "/nr1",
  items: [
    { href: "/nr1", label: "Campanhas", icon: <ClipboardList className="h-4 w-4" />, exact: true },
    { href: "/nr1/ativa", label: "Campanha ativa", icon: <span className="text-[10px]">✦</span> },
    { href: "/nr1/matriz-risco", label: "Matriz de risco", icon: <span className="text-[10px]">⊞</span> },
    { href: "/nr1/plano-acao", label: "Plano de ação", icon: <span className="text-[10px]">◇</span> },
    { href: "/nr1/evidencias", label: "Evidências GRO/PGR", icon: <span className="text-[10px]">❖</span> },
    { href: "/organizations", label: "Organograma", icon: <Building2 className="h-4 w-4" /> },
  ],
};

const profissionalGroup: NavGroup = {
  label: "Profissional",
  icon: <Stethoscope className="h-4 w-4" />,
  baseHref: "/profissional",
  items: [
    { href: "/profissional/carteira", label: "Carteira de empresas", icon: <BookOpen className="h-4 w-4" /> },
    { href: "/profissional/documentos", label: "Documentos & assinatura", icon: <FileText className="h-4 w-4" /> },
    { href: "/profissional/agenda", label: "Agenda técnica", icon: <Calendar className="h-4 w-4" /> },
  ],
};

const recruitmentGroup: NavGroup = {
  label: "Recrutamento IA",
  icon: <Briefcase className="h-4 w-4" />,
  baseHref: "/recruitment",
  items: [
    { href: "/recruitment/jobs", label: "Vagas", icon: <Briefcase className="h-4 w-4" /> },
    { href: "/recruitment/candidates", label: "Candidatos", icon: <Users className="h-4 w-4" /> },
    { href: "/recruitment/folders", label: "Banco de Talentos", icon: <FolderOpen className="h-4 w-4" /> },
  ],
};

const adminGroup: NavGroup = {
  label: "Administração",
  icon: <Settings className="h-4 w-4" />,
  baseHref: "/admin",
  items: [
    { href: "/admin/clientes", label: "Gestão de Clientes", icon: <Building className="h-4 w-4" /> },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    nr1: true,
    profissional: false,
    recruitment: true,
    admin: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(g => ({ ...g, [key]: !g[key] }));
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location === href;
    return location === href || location.startsWith(href + "/");
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.href, item.exact));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 shrink-0",
          sidebarOpen ? "w-60" : "w-14"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">PS</span>
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="font-bold text-sm truncate text-white">Psicossocial</div>
              <div className="text-xs text-sidebar-foreground/60 truncate">& Recrutamento IA</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* Dashboard */}
          <Link href="/">
            <div className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors cursor-pointer",
              isActive("/", true)
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>Dashboard</span>}
            </div>
          </Link>

          {/* NR-1 Group */}
          <CollapsibleGroup
            group={nr1Group}
            groupKey="nr1"
            open={openGroups.nr1}
            collapsed={!sidebarOpen}
            active={isGroupActive(nr1Group)}
            onToggle={() => toggleGroup("nr1")}
            isActive={isActive}
          />

          {/* Profissional Group */}
          <CollapsibleGroup
            group={profissionalGroup}
            groupKey="profissional"
            open={openGroups.profissional}
            collapsed={!sidebarOpen}
            active={isGroupActive(profissionalGroup)}
            onToggle={() => toggleGroup("profissional")}
            isActive={isActive}
          />

          {/* Recrutamento Group */}
          <CollapsibleGroup
            group={recruitmentGroup}
            groupKey="recruitment"
            open={openGroups.recruitment}
            collapsed={!sidebarOpen}
            active={isGroupActive(recruitmentGroup)}
            onToggle={() => toggleGroup("recruitment")}
            isActive={isActive}
          />

          {/* Admin Group */}
          <CollapsibleGroup
            group={adminGroup}
            groupKey="admin"
            open={openGroups.admin}
            collapsed={!sidebarOpen}
            active={isGroupActive(adminGroup)}
            onToggle={() => toggleGroup("admin")}
            isActive={isActive}
          />
        </nav>

        {/* User + Collapse */}
        <div className="border-t border-sidebar-border">
          {sidebarOpen && user && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-sidebar-border/50">
              <UserCircle className="h-5 w-5 text-sidebar-foreground/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-sidebar-foreground truncate">
                  {user.firstName || user.username || "Usuário"}
                </div>
                <div className="text-[10px] text-sidebar-foreground/50 truncate">{user.email || ""}</div>
              </div>
              <button
                onClick={() => logout()}
                className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              {sidebarOpen && <span className="ml-2 text-xs">Recolher</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function CollapsibleGroup({
  group, groupKey, open, collapsed, active, onToggle, isActive,
}: {
  group: NavGroup;
  groupKey: string;
  open: boolean;
  collapsed: boolean;
  active: boolean;
  onToggle: () => void;
  isActive: (href: string, exact?: boolean) => boolean;
}) {
  if (collapsed) {
    return (
      <>
        <div className="my-1 border-t border-sidebar-border/30" />
        {group.items.map(item => (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "flex items-center justify-center px-2 py-2 rounded-md text-sm transition-colors cursor-pointer",
              isActive(item.href, item.exact)
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )} title={item.label}>
              <span className="shrink-0">{item.icon}</span>
            </div>
          </Link>
        ))}
      </>
    );
  }

  return (
    <div className="pt-2">
      {/* Group Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors",
          active
            ? "text-sidebar-foreground/90"
            : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
        )}
      >
        <span className="shrink-0">{group.icon}</span>
        <span className="flex-1 text-left">{group.label}</span>
        {open
          ? <ChevronDown className="h-3 w-3" />
          : <ChevronRight className="h-3 w-3" />
        }
      </button>

      {/* Group Items */}
      {open && (
        <div className="mt-0.5 ml-2 space-y-0.5 border-l border-sidebar-border/40 pl-2">
          {group.items.map(item => (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                isActive(item.href, item.exact)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <span className="shrink-0 w-4 flex items-center justify-center">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
