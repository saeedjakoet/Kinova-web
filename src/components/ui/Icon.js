import {
  Check, X, Plus, Search, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ChevronDown, ChevronUp, ChevronRight,
  TriangleAlert, Info, CircleHelp, Leaf, Send, Columns2, History, User, Dna, GitFork, RefreshCw,
  SlidersVertical, Egg, Menu, Shield, Target, LoaderCircle, Ban, MessageCircle, LayoutGrid,
  Clock, Bookmark, Eye, EyeOff, LogOut,
} from 'lucide-react';

// Venus / Mars aren't in this lucide version — same paths as the Figma Icon/female and Icon/male.
function strokeIcon(children) {
  return function StrokeIcon({ size = 24, strokeWidth = 1.75, className, ...rest }) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
        {children}
      </svg>
    );
  };
}
const Venus = strokeIcon(<><circle cx="12" cy="9" r="6" /><path d="M12 15v7" /><path d="M9 19h6" /></>);
const Mars = strokeIcon(<><circle cx="10" cy="14" r="6" /><path d="m21 3-6.6 6.6" /><path d="M15 3h6v6" /></>);

// Same icon set as the Figma "Icon/*" components (Lucide, 24px grid, 1.75 stroke).
const ICONS = {
  check: Check, x: X, plus: Plus, search: Search,
  'arrow-right': ArrowRight, 'arrow-left': ArrowLeft, 'arrow-up': ArrowUp, 'arrow-down': ArrowDown,
  'chevron-down': ChevronDown, 'chevron-up': ChevronUp, 'chevron-right': ChevronRight,
  alert: TriangleAlert, info: Info, help: CircleHelp, leaf: Leaf, send: Send, columns: Columns2,
  history: History, user: User, dna: Dna, lineage: GitFork, refresh: RefreshCw, sliders: SlidersVertical,
  egg: Egg, female: Venus, male: Mars, menu: Menu, shield: Shield, target: Target, loader: LoaderCircle,
  ban: Ban, message: MessageCircle, grid: LayoutGrid, clock: Clock, bookmark: Bookmark,
  eye: Eye, 'eye-off': EyeOff, 'log-out': LogOut,
};

export default function Icon({ name, size = 18, className, strokeWidth = 1.75, ...rest }) {
  const Cmp = ICONS[name];
  if (!Cmp) return null;
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" focusable="false" {...rest} />;
}
