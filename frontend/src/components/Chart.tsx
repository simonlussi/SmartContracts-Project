import { createChart, ColorType } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';


export const ChartComponent = (data: any[]) => {
	const colors = {
    backgroundColor: 'white',
    lineColor: '#2962FF',
    textColor: 'black',
    areaTopColor: '#2962FF',
    areaBottomColor: 'rgba(41, 98, 255, 0.28)',
  };

	const chartContainerRef = useRef(null);

	useEffect(
		() => {
			const handleResize = () => {
				chart.applyOptions({ width: chartContainerRef?.current.clientWidth });
			};

			const chart = createChart(chartContainerRef.current, {
				layout: {
					background: { type: ColorType.Solid, color: colors.backgroundColor },
					textColor: colors.textColor,
				},
				width: chartContainerRef?.current.clientWidth,
				height: 300,
			});
			chart.timeScale().fitContent();

			const newSeries = chart.addAreaSeries({ lineColor: colors.lineColor, topColor: colors.areaTopColor, bottomColor: colors.areaBottomColor });
			newSeries.setData(data);

			window.addEventListener('resize', handleResize);

			return () => {
				window.removeEventListener('resize', handleResize);

				chart.remove();
			};
		},
		[data, colors]
	);

	return (
		<div
			ref={chartContainerRef}
		/>
	);
};
