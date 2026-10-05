export interface DepartmentMeta {
  department: string;
  icon: string;
  gradient: string;
  badgeClass: string;
  bgSoft: string;
  accentText: string;
}

export function getDepartmentMeta(serviceName: string = ""): DepartmentMeta {
  const name = serviceName.toLowerCase();

  if (name.includes("cardio") || name.includes("heart") || name.includes("ecg")) {
    return {
      department: "Cardiology",
      icon: "🫀",
      gradient: "from-rose-500 to-red-600",
      badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900",
      bgSoft: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300",
      accentText: "text-rose-600 dark:text-rose-400",
    };
  }

  if (name.includes("ortho") || name.includes("joint") || name.includes("bone")) {
    return {
      department: "Orthopedics",
      icon: "🦴",
      gradient: "from-blue-600 to-indigo-600",
      badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900",
      bgSoft: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300",
      accentText: "text-blue-600 dark:text-blue-400",
    };
  }

  if (name.includes("derma") || name.includes("skin")) {
    return {
      department: "Dermatology",
      icon: "✨",
      gradient: "from-purple-500 to-pink-600",
      badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900",
      bgSoft: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300",
      accentText: "text-purple-600 dark:text-purple-400",
    };
  }

  if (name.includes("pediatric") || name.includes("child")) {
    return {
      department: "Pediatrics",
      icon: "👶",
      gradient: "from-amber-500 to-orange-500",
      badgeClass: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900",
      bgSoft: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300",
      accentText: "text-amber-600 dark:text-amber-400",
    };
  }

  if (name.includes("checkup") || name.includes("preventive") || name.includes("full body")) {
    return {
      department: "Health Screening",
      icon: "🛡️",
      gradient: "from-cyan-500 to-teal-600",
      badgeClass: "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900",
      bgSoft: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300",
      accentText: "text-cyan-600 dark:text-cyan-400",
    };
  }

  return {
    department: "General Medicine",
    icon: "🩺",
    gradient: "from-emerald-500 to-teal-600",
    badgeClass: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
    bgSoft: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300",
    accentText: "text-emerald-600 dark:text-emerald-400",
  };
}
