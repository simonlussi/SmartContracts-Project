import { createChart, ColorType } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

interface ChartDataPoint {
  time: string;
  value: number;
}

interface Props {
  volumes: ChartDataPoint[];
  transfers: ChartDataPoint[];
}

const ChartComponent = (props: Props) => {
  const colors = {
    backgroundColor: '#202020',
    lineColor: '#2962FF',
    barColor: '#DC3545',
    textColor: 'white',
  };

  const chartContainerRef = useRef(null);

  useEffect(() => {
    const { volumes, transfers } = props;
    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef?.current.clientWidth });
    };
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.backgroundColor },
        textColor: colors.textColor,
      },
      width: chartContainerRef?.current.clientWidth,
      height: chartContainerRef?.current.clientHeight,
      grid: {
        vertLines: {
          visible: false,
        },
        horzLines: {
          visible: false,
        },
      },
      leftPriceScale: {
        visible: true,
        textColor: colors.barColor,
        scaleMargins: {
          bottom: 0,
        },
      },
      rightPriceScale: {
        visible: true,
        textColor: colors.lineColor,
        scaleMargins: {
          bottom: 0,
        },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        visible: true,
      },
    });

    const transferSeries = chart.addHistogramSeries({
      color: colors.barColor,
      priceScaleId: 'left',
    });
    transferSeries.setData(transfers);

    const volumeSeries = chart.addLineSeries({
      color: colors.lineColor,
      priceScaleId: 'right',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => Intl.NumberFormat().format(price),
      },
    });
    volumeSeries.setData(volumes);

    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      chart.remove();
    };
  }, [props, colors]);

  return <div className='h-[500px] w-3/4' ref={chartContainerRef} />;
};

export default ChartComponent;
