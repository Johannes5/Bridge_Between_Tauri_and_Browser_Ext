export const mdLIMIT_INFO_BUTTON_TOOLTIP = `
A **limit** is just a timeframe or contingent where you are allowed only the allotted time on each site. Once it is reached, a popup will stop you from using the site.
<small>
> A **/** in the url bar signals that a specific url is targeted.  
> If **'youtube.com/'** is the value, then we only want the YouTube home feed blocked, not the entire domain.
> Also: if the url is **'domain.com/something'**  
> then urls like **'domain.com/something/more/specific'** will also be blocked.
> But: if the url is **'domain.com/something/'** (<- notice the **/** at the end)  
> then **'domain.com/something/more/specific'** will **not** be blocked.
</small>`

export const mdSTOPS_INFO_BUTTON_TOOLTIP = `
A website with a **"Stop"** will show (unless it also has a limit which was reached). But you have to stop and think: **Should I really go to this website? Now?** A **countdown timer** (for example, 15 seconds) will give you some time to ponder that. Or prompt you to do something else. This makes addicting sites less of an instant **dopamine button** by introducing friction.`
