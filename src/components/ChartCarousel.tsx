import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { TransactionChart } from "./TransactionChart";
import { CategoryPieChart } from "./CategoryPieChart";
import type { ChartDataPoint, Transaction } from "@/hooks/useTransactions";

interface ChartCarouselProps {
  chartData: ChartDataPoint[];
  transactions: Transaction[];
}

export function ChartCarousel({ chartData, transactions }: ChartCarouselProps) {
  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        <CarouselItem className="pl-2 md:pl-4">
          <TransactionChart data={chartData} />
        </CarouselItem>
        <CarouselItem className="pl-2 md:pl-4">
          <CategoryPieChart transactions={transactions} />
        </CarouselItem>
      </CarouselContent>
      <div className="mt-4 flex justify-center gap-2">
        <CarouselPrevious className="static translate-y-0" />
        <CarouselNext className="static translate-y-0" />
      </div>
    </Carousel>
  );
}
