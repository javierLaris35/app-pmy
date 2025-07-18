// components/ui/timeline.tsx
import { cn } from "@/lib/utils"

interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {}
interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {}
interface TimelineSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}
interface TimelineDotProps extends React.HTMLAttributes<HTMLDivElement> {}
interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface TimelineConnectorProps extends React.HTMLAttributes<HTMLDivElement> {}

const Timeline = ({ className, ...props }: TimelineProps) => (
  <div className={cn("space-y-8", className)} {...props} />
)

const TimelineItem = ({ className, ...props }: TimelineItemProps) => (
  <div className={cn("relative flex gap-4", className)} {...props} />
)

const TimelineSeparator = ({ className, ...props }: TimelineSeparatorProps) => (
  <div className={cn("flex flex-col items-center", className)} {...props} />
)

const TimelineDot = ({ className, ...props }: TimelineDotProps) => (
  <div
    className={cn(
      "h-3 w-3 rounded-full border-2 border-primary bg-background mt-1",
      className
    )}
    {...props}
  />
)

const TimelineContent = ({ className, ...props }: TimelineContentProps) => (
  <div className={cn("flex-1 pb-8", className)} {...props} />
)

const TimelineConnector = ({ className, ...props }: TimelineConnectorProps) => (
  <div
    className={cn("h-full w-px bg-border flex-1", className)}
    {...props}
  />
)

export {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineContent,
  TimelineConnector
}