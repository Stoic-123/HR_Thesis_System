declare module "mina-scheduler" {
  export type Event = {
    id: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    variant?: "primary" | "danger" | "success" | "warning" | "default";
    color?: string;
  };

  export const SchedulerProvider: React.ComponentType<{
    children: React.ReactNode;
    initialState?: Event[];
    weekStartsOn?: "sunday" | "monday";
    onAddEvent?: (event: Event) => void;
    onUpdateEvent?: (event: Event) => void;
    onDeleteEvent?: (id: string) => void;
  }>;

  export const SchedularView: React.ComponentType<{
    views?: {
      views?: Array<"day" | "week" | "month">;
      mobileViews?: Array<"day" | "week" | "month">;
    };
    classNames?: Record<string, any>;
    CustomComponents?: Record<string, any>;
  }>;
}

