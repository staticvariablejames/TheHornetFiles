import { chromium } from 'playwright';
import { openCookieClickerPage } from 'cookie-connoisseur';

declare global {
    let M: typeof Game.Objects.Farm.minigame;
    let queenbeetId: number;
    let jqbId: number;
    let tickGarden: () => void;
    let plantQueenbeet: (x: number, y: number) => void;
    let plantQueenbeetRingAround: (x: number, y: number) => void;
    let countPlant: (plantId: number) => number;
    let runJQBAttempt: () => boolean;
}

function init() {
    M = Game.Objects.Farm.minigame;
    queenbeetId = Game.Objects.Farm.minigame.plants['queenbeet'].id;
    jqbId = Game.Objects.Farm.minigame.plants['queenbeetLump'].id;

    tickGarden = () => {
        M.nextStep = 1.6e12;
        M.logic!();
    }

    plantQueenbeet = (x: number, y: number) => {
        M.useTool(queenbeetId, x, y);
    }

    plantQueenbeetRingAround = (x: number, y: number) => {
        if(x <= 0 || x >= 5) {
            console.log(`Refusing to plant around ${x}, ${y}`);
            return;
        }
        if(y <= 0 || y >= 5) {
            console.log(`Refusing to plant around ${x}, ${y}`);
            return;
        }
        for(let i = x-1; i <= x+1; i++) {
            for(let j = y-1; j <= y+1; j++) {
                if(i !== x || j !== y) {
                    plantQueenbeet(i, j);
                }
            }
        }
    }

    countPlant = (plantId: number) => {
        let count = 0;
        for(let i = 0; i < 6; i++) {
            for(let j = 0; j < 6; j++) {
                if(M.plot[i][j][0] == plantId + 1) {
                    count++;
                }
            }
        }
        return count;
    }

    runJQBAttempt = () => {
        M.harvestAll();
        plantQueenbeetRingAround(1, 1);
        plantQueenbeetRingAround(4, 1);
        plantQueenbeetRingAround(1, 4);
        plantQueenbeetRingAround(4, 4);

        while(countPlant(queenbeetId) > 0) {
            tickGarden();
        }
        return countPlant(jqbId) > 0;
    }
}

async function run1kAttempts() {
    let browser = await chromium.launch({headless: true});
    let page = await openCookieClickerPage(browser, {saveGame: {
        cookies: 1e100,
        buildings: {
            'Farm': {
                amount: 300,
                level: 9,
                minigame: {
                    soil: 'woodchips',
                    unlockedPlants: [
                        'bakerWheat',
                        'queenbeet',
                    ],
                },
            },
        },
    }});
    await page.waitForFunction(() => Game.isMinigameReady(Game.Objects['Farm']));

    await page.evaluate(init);
    let successes = 0;
    for(let i = 0; i < 1000; i++) {
        successes += Number(await page.evaluate(() => runJQBAttempt()));
    }

    await page.close();
    await browser.close();
    return successes;
}

setTimeout(async () => {
    let total = 0;
    for(let i = 0; i < 100; i++) {
        let successes = await run1kAttempts();
        console.log(`Attempt ${i+1}: ${successes}`);
        total += successes;
    }
    console.log(`Total: ${total}, ${total/1e5 * 100}%`);
});
