import { useClickOutside } from '@mantine/hooks';
import { ReactNode, useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { usePopperTooltip } from 'react-popper-tooltip';
import rehypeRaw from 'rehype-raw';

export default function CustomTooltip({
    tooltipText = '',
    shortCutLabel = '',
    activateMethod = 'hover',
    tooltipContent = null,
    closeOnClick,
    children,
    tooltipColor = '#1D1D1D',
    showArrow = true,
    tooltipInnerClass = '',
    tooltipOuterClass = '',
}: {
    tooltipText?: string;
    shortCutLabel?: string;
    activateMethod?: 'hover' | 'click';
    tooltipContent?: ReactNode;
    children: (ref: any) => ReactNode;
    closeOnClick?: boolean;
    showArrow?: boolean;
    tooltipColor?: string;
    tooltipInnerClass?: string;
    tooltipOuterClass?: string;
}) {
    const [visibleViaClick, setVisibleViaClick] = useState(false);
    const {
        getArrowProps,
        getTooltipProps,
        setTooltipRef,
        setTriggerRef,
        triggerRef,
        tooltipRef,
        visible: visibleViaHover,
    } = usePopperTooltip(
        {
            interactive: true,
            delayHide: 300,
        },
        {
            placement: 'auto-start',
        }
    );

    const innerRef = useClickOutside(() => setVisibleViaClick(false), null, [triggerRef, tooltipRef]);

    function shouldShow() {
        if (activateMethod === 'hover') return visibleViaHover;
        if (activateMethod === 'click') return visibleViaClick;
        return false;
    }

    function returnToolTip() {
        if (!tooltipText && !tooltipContent) return null;
        return shouldShow() ? (
            <div
                ref={setTooltipRef}
                {...getTooltipProps({
                    className: `tooltip-container text-white text-sm flex flex-row gap-x-3 animate__animated animate__fadeIn animate__faster overflow-hidden z-[999999999] min-w-[400px] ${tooltipOuterClass}`,
                    style: {
                        background: tooltipColor,
                        fontFamily: 'Karla',
                    },
                })}
                onClick={() => {
                    if (closeOnClick) setVisibleViaClick(!visibleViaClick);
                }}
            >
                <div className={`px-3 py-2 flex items-center space-x-2 ${tooltipInnerClass}`} ref={innerRef}>
                    <>
                        <div>
                            <Markdown rehypePlugins={[rehypeRaw]}>{tooltipText}</Markdown>
                        </div>
                        {shortCutLabel && (
                            <div>
                                <div className="p-2 bg-white/20 rounded">{shortCutLabel}</div>
                            </div>
                        )}
                    </>
                    {tooltipContent}
                    {showArrow && (
                        <div
                            {...getArrowProps({
                                className: 'tooltip-arrow',
                            })}
                        />
                    )}
                </div>
            </div>
        ) : null;
    }

    useEffect(() => {
        if (triggerRef && triggerRef?.addEventListener && triggerRef?.removeEventListener) {
            const handleClick = () => setVisibleViaClick((prev) => !prev);

            triggerRef.addEventListener('click', handleClick, false);
            return () => {
                triggerRef.removeEventListener('click', handleClick, false);
            };
        }
    }, [triggerRef]);

    return (
        <>
            {/* {children && triggerRef && ( */}
            <span>
                {children(setTriggerRef)}
                {returnToolTip()}
            </span>
            {/* )} */}
        </>
    );
}
