import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List, CalendarRange } from "lucide-react";
import { WeeklyView } from "./weekly-view";
import { DailyView } from "./daily-view";
import { MonthlyView } from "./monthly-view";
import { type Appointment } from "../types";

export type ViewMode = "semana" | "dia" | "mes";

interface CalendarViewProps {
    view: ViewMode;
    onViewChange: (view: ViewMode) => void;
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    dateLabel: string;
    onNavigate: (direction: -1 | 1) => void;
    onGoToToday: () => void;
    appointments: Appointment[];
    onDayClick: (date: Date) => void;
    showOwnershipFilter?: boolean;
    onlyMine?: boolean;
    onOnlyMineChange?: (onlyMine: boolean) => void;
}

export function CalendarDashboard({
    view,
    onViewChange,
    selectedDate,
    onDateChange,
    dateLabel,
    onNavigate,
    onGoToToday,
    appointments,
    onDayClick,
    showOwnershipFilter = false,
    onlyMine = false,
    onOnlyMineChange,
}: CalendarViewProps) {
    return (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => onNavigate(-1)}
                        title="Período anterior"
                        id="btn-prev"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="min-w-50 justify-center gap-2 font-medium capitalize"
                                id="btn-date-picker"
                            >
                                <CalendarDays className="size-4" />
                                {dateLabel}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && onDateChange(date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => onNavigate(1)}
                        title="Próximo período"
                        id="btn-next"
                    >
                        <ChevronRight className="size-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onGoToToday}
                        id="btn-today"
                    >
                        Hoje
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                {showOwnershipFilter && (
                    <div className="flex items-center gap-2">
                        <Switch id="only-mine" checked={onlyMine} onCheckedChange={onOnlyMineChange} />
                        <Label htmlFor="only-mine" className="cursor-pointer text-sm font-normal">
                            Só os meus agendamentos
                        </Label>
                    </div>
                )}

                <Tabs value={view} onValueChange={(v) => onViewChange(v as ViewMode)}>
                    <TabsList>
                        <TabsTrigger value="mes" className="gap-1.5" id="tab-month-view">
                            <CalendarRange className="size-3.5" />
                            <span className="hidden sm:inline">Mês</span>
                        </TabsTrigger>
                        <TabsTrigger value="semana" className="gap-1.5" id="tab-week-view">
                            <LayoutGrid className="size-3.5" />
                            <span className="hidden sm:inline">Semana</span>
                        </TabsTrigger>
                        <TabsTrigger value="dia" className="gap-1.5" id="tab-day-view">
                            <List className="size-3.5" />
                            <span className="hidden sm:inline">Dia</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                </div>
            </div>

            <div className="rounded-lg border bg-card flex flex-col overflow-hidden flex-1 min-h-0">
                {view === "mes" && (
                    <MonthlyView
                        appointments={appointments}
                        selectedDate={selectedDate}
                        onDayClick={onDayClick}
                    />
                )}
                {view === "semana" && (
                    <WeeklyView
                        appointments={appointments}
                        selectedDate={selectedDate}
                        onDayClick={onDayClick}
                    />
                )}
                {view === "dia" && (
                    <div className="flex flex-col flex-1 min-h-0 p-4">
                        <DailyView
                            appointments={appointments}
                            selectedDate={selectedDate}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
