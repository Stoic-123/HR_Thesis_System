"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{ layoutId: string }>({ layoutId: "activeTab" })

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const id = React.useId()
  const layoutId = `active-tab-pill-${id.replace(/:/g, "")}`

  return (
    <TabsContext.Provider value={{ layoutId }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsContext.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-11 w-fit items-center justify-center rounded-xl bg-muted/60 p-1 text-muted-foreground border border-border/40",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { layoutId } = React.useContext(TabsContext)
  const ref = React.useRef<HTMLButtonElement>(null)
  const [isActive, setIsActive] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const checkActive = () => {
      setIsActive(el.getAttribute("data-state") === "active")
    }

    checkActive()

    const observer = new MutationObserver(checkActive)
    observer.observe(el, { attributes: true, attributeFilter: ["data-state"] })

    return () => observer.disconnect()
  }, [])

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:text-foreground data-[state=active]:text-primary-foreground data-[state=active]:font-semibold",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 bg-primary rounded-lg shadow-sm z-0"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
