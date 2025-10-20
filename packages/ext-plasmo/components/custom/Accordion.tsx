import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDownIcon } from "@radix-ui/react-icons"
import classNames from "classnames"
import React, { ComponentPropsWithRef } from "react"

import "~/assets/styles/tailwind.css"

const Accordion = () => (
  <AccordionPrimitive.Root
    className="w-full rounded-md ring-2 ring-white/20"
    type="single"
    defaultValue=""
    collapsible>
    <AccordionItem value="advert">
      <AccordionTrigger className="bg-white/20 border border-transparent transition-all duration-300 rounded hover:border-[rgb(66,87,187)]">
        Wait ✋, there's more ...
      </AccordionTrigger>
      {/*<div className="h-5 w-full"></div>*/}
      <AccordionContentContainer>
        <AccordionPrimitive.Root
          className="bg-transparent w-full rounded-md"
          type="single"
          defaultValue="mapmap"
          collapsible>
          {/*<AccordionItem value="hubhub">
                        <AccordionTrigger>HubHub</AccordionTrigger>
                        <AccordionContent>
                            <div>
                                <p className="text-[1.375rem] leading-normal">
                                    We've built{' '}
                                    <span className="font-semibold text-[rgba(64,_98,_221,_0.85)]">HubHub</span> which
                                    allows you to bring the best Shorts, Podcasts, Videos, Posts... into one
                                    customisable place{' '}
                                </p>
                                <p>
                                    So your time spent browsing online is{' '}
                                    <span className="italic text-[#FFCD46]">time well-spent</span>{' '}
                                    <span className="font-bold italic text-[rgba(64,_98,_221,_0.85)]">
                                        (and not a product for advertisers)
                                    </span>
                                </p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>*/}
          <AccordionItem value="mapmap">
            <AccordionTrigger>MapMap</AccordionTrigger>
            <AccordionContent>
              <div>
                <p>
                  <strong>Writing = understanding</strong>
                </p>
                <p>
                  So we built a writing tool that is designed for mapping out
                  your thoughts. Instead of a linear document - you get a
                  canvas. Double-click anywhere start writing. Use shortcuts to
                  apply structure and color. You really have to see and try it
                  for yourself.{" "}
                  <a
                    href="https://mapmap.app"
                    className="text-[rgba(64,_98,_221,_0.85)] hover:underline">
                    Click here.
                  </a>
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </AccordionPrimitive.Root>
      </AccordionContentContainer>
    </AccordionItem>
  </AccordionPrimitive.Root>
)

const AccordionItem = React.forwardRef(
  (
    { children, className, ...props }: ComponentPropsWithRef<any>,
    forwardedRef
  ) => (
    <AccordionPrimitive.Item
      className={classNames(
        "mt-px overflow-hidden first:mt-0 first:rounded-t last:rounded-b focus-within:relative focus-within:z-10",
        className
      )}
      {...props}
      ref={forwardedRef}>
      {children}
    </AccordionPrimitive.Item>
  )
)

const AccordionTrigger = React.forwardRef(
  (
    { children, className, ...props }: React.ComponentPropsWithRef<any>,
    forwardedRef
  ) => (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={classNames(
          "bg-transparent text-white group flex h-[45px] flex-1 cursor-default items-center justify-between px-5 text-[15px] leading-none outline-none",
          className
        )}
        {...props}
        ref={forwardedRef}>
        {children}
        <ChevronDownIcon
          className="text-white ease-[cubic-bezier(0.87,_0,_0.13,_1)] transition-transform duration-300 group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
)

const AccordionContent = React.forwardRef(
  (
    { children, className, ...props }: ComponentPropsWithRef<any>,
    forwardedRef
  ) => (
    <AccordionPrimitive.Content
      className={classNames(
        "text-white bg-transparent data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp overflow-hidden text-[15px]",
        className
      )}
      {...props}
      ref={forwardedRef}>
      <div className="py-[15px] px-5">{children}</div>
    </AccordionPrimitive.Content>
  )
)

const AccordionContentContainer = React.forwardRef(
  (
    { children, className, ...props }: ComponentPropsWithRef<any>,
    forwardedRef
  ) => (
    <AccordionPrimitive.Content
      className={classNames(
        "rounded-md text-white bg-transparent data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp overflow-hidden text-[15px]",
        className
      )}
      {...props}
      ref={forwardedRef}>
      <div className="">{children}</div>
    </AccordionPrimitive.Content>
  )
)
export default Accordion
