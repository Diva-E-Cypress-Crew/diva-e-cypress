export const selAnlegen = () => cy.get('section:nth-child(2) div div:nth-child(2).cursor-pointer')

export const selEndbetrag = () => cy.get('#calculator > section:nth-child(3) > div:nth-child(2) > div > section > div > div:nth-child(1) > div')

//export const selAnlagebetragInput = () => cy.get('#calculator > section:nth-child(3) > div:nth-child(2) > div > div:nth-child(2) > div > div > section > div.w-full.p-9.bg-gray-50.relative.box-border > div.grid.grid-cols-1.gap-16.w-full > div:nth-child(1) > div > div > div.flex.w-full.justify-between.items-center.border-2.border-gray-200.h-12.bg-white.border-solid > div.px-6.flex.justify-between.w-full.text-gray-400.font-medium.relative.box-border.flex.align-center > input')
export const selAnlagebetragInput = () => cy.get('#calculator > section:nth-child(3) > div:nth-child(2) > div > div:nth-child(2) > div > div > section > div.w-full.p-9.bg-gray-50.relative.box-border > div > div:nth-child(1) > div > div > div.flex.w-full.justify-between.items-center.border-2.border-gray-200.h-12.bg-white.border-solid input')

export const selEndbetragLabel = () => cy.get('#4 > div > span:nth-child(1)')
export const selEndbetragValue = () => cy.get('#4 > div > span:nth-child(2)')