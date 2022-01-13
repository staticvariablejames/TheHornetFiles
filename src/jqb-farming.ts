import { chromium } from 'playwright';
import { openCookieClickerPage } from 'cookie-connoisseur';

declare global {
    let M: typeof Game.Objects.Farm.minigame;
    let queenbeetId: number;
    let jqbId: number;
    let tickGarden: () => void;
    let plantQueenbeet: (x: number, y: number) => void;
    let plantQueenbeetRingAround: (x: number, y: number) => void;
    let plantLowerQueenbeetRingAround: (x: number, y: number) => void;
    let plantUpperQueenbeetRingAround: (x: number, y: number) => void;
    let countPlant: (plantId: number) => number;
    let countPlantsAround: (plantId: number, x: number, y: number) => number;
    let countQBrings: () => number;
    let strategies: Record<string, () => boolean>;
    let currentStrategy: () => boolean;
}

class Options {
    strategy: string = '';
    seedlessToNay: boolean = true;
    weedNonJQB: boolean = false;
}

function processCommandLineArgs(argv: string[]) {
    let options = new Options();
    while(argv.length > 0) {
        let arg = argv.shift();
        if(arg!.substring(0, 2) != '--') {
            options.strategy = arg!;
            continue;
        }
        switch(arg) {
            case '--seedless-to-nay':    options.seedlessToNay = true;  break;
            case '--no-seedless-to-nay': options.seedlessToNay = false; break;
            case '--weed-non-jqb':       options.weedNonJQB = true;     break;
            case '--no-weed-non-jqb':    options.weedNonJQB = false;    break;
            default: throw new Error(`Unrecognized option ${arg}`);
        }
    }

    return options;
}

function init(options: Options) {
    M = Game.Objects.Farm.minigame;
    queenbeetId = Game.Objects.Farm.minigame.plants['queenbeet'].id;
    jqbId = Game.Objects.Farm.minigame.plants['queenbeetLump'].id;
    strategies = {};

    tickGarden = () => {
        M.nextStep = 1.6e12;
        M.logic!();
        if(!options.weedNonJQB) return;
        for(let y = 0; y < 6; y++) {
            for(let x = 0; x < 0; x++) {
                if(M.plot[y][x][0] != queenbeetId+1 || M.plot[y][x][0] != jqbId+1) {
                    M.harvest(x,y,undefined);
                }
            }
        }
    }

    plantQueenbeet = (x: number, y: number) => {
        if(M.plot[y][x][0] == queenbeetId+1) return;
        M.plot[y][x] = [queenbeetId+1, 0];
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

    plantLowerQueenbeetRingAround = (x: number, y: number) => {
        if(x <= 0 || x >= 5) {
            console.log(`Refusing to plant around ${x}, ${y}`);
            return;
        }
        if(y <= 0 || y >= 5) {
            console.log(`Refusing to plant around ${x}, ${y}`);
            return;
        }
        plantQueenbeet(x-1, y+1);
        plantQueenbeet(x,   y+1);
        plantQueenbeet(x+1, y+1);
        plantQueenbeet(x+1, y);
    }

    plantUpperQueenbeetRingAround = (x: number, y: number) => {
        if(x <= 0 || x >= 5) {
            console.log(`Refusing to plant around ${x}, ${y}`);
            return;
        }
        if(y <= 0 || y >= 5) {
            console.log(`Refusing to plant around ${x}, ${y}`);
            return;
        }
        plantQueenbeet(x-1, y);
        plantQueenbeet(x-1, y-1);
        plantQueenbeet(x,   y-1);
        plantQueenbeet(x+1, y-1);
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

    countPlantsAround = (plantId: number, x: number, y: number) => {
        if(x <= 0 || x >= 5) {
            console.log(`Refusing to count around ${x}, ${y}`);
            return 0;
        }
        if(y <= 0 || y >= 5) {
            console.log(`Refusing to count around ${x}, ${y}`);
            return 0;
        }
        let count = 0;
        count += Number(M.plot[x-1][y-1][0] == plantId + 1);
        count += Number(M.plot[x-1][y  ][0] == plantId + 1);
        count += Number(M.plot[x-1][y+1][0] == plantId + 1);
        count += Number(M.plot[x  ][y-1][0] == plantId + 1);
        count += Number(M.plot[x  ][y+1][0] == plantId + 1);
        count += Number(M.plot[x+1][y-1][0] == plantId + 1);
        count += Number(M.plot[x+1][y  ][0] == plantId + 1);
        count += Number(M.plot[x+1][y+1][0] == plantId + 1);
        return count;
    }

    countQBrings = () => {
        return Number(countPlantsAround(queenbeetId, 1, 1) >= 8) +
            Number(countPlantsAround(queenbeetId, 1, 4) >= 8) +
            Number(countPlantsAround(queenbeetId, 4, 1) >= 8) +
            Number(countPlantsAround(queenbeetId, 4, 4) >= 8);
    }

    strategies['simpleRings'] = () => {
        M.harvestAll();
        plantQueenbeetRingAround(1, 1);
        plantQueenbeetRingAround(4, 1);
        plantQueenbeetRingAround(1, 4);
        plantQueenbeetRingAround(4, 4);

        while(countPlant(queenbeetId) > 0) {
            tickGarden();
        }
        //  countPlantsAround(queenbeetId, 1, 1) >= 8 ||
        //  countPlantsAround(queenbeetId, 1, 4) >= 8 ||
        //  countPlantsAround(queenbeetId, 4, 1) >= 8 ||
        //  countPlantsAround(queenbeetId, 4, 4) >= 8
        return countPlant(jqbId) > 0;
    }

    strategies['fusedRings'] = () => {
        M.harvestAll();
        plantQueenbeetRingAround(1, 1);
        plantQueenbeetRingAround(3, 1);
        plantQueenbeetRingAround(1, 3);
        plantQueenbeetRingAround(3, 3);

        while(countPlant(queenbeetId) > 0) {
            tickGarden();
        }
        return countPlant(jqbId) > 0;
    }

    strategies['staggeredRings'] = () => {
        M.harvestAll();

        plantLowerQueenbeetRingAround(1, 1);
        plantLowerQueenbeetRingAround(4, 1);
        plantLowerQueenbeetRingAround(1, 4);
        plantLowerQueenbeetRingAround(4, 4);
        tickGarden();
        plantUpperQueenbeetRingAround(1, 1);
        plantUpperQueenbeetRingAround(4, 1);
        plantUpperQueenbeetRingAround(1, 4);
        plantUpperQueenbeetRingAround(4, 4);

        while(countPlant(queenbeetId) > 0) {
            tickGarden();
        }
        //  countPlantsAround(queenbeetId, 1, 1) >= 8 ||
        //  countPlantsAround(queenbeetId, 1, 4) >= 8 ||
        //  countPlantsAround(queenbeetId, 4, 1) >= 8 ||
        //  countPlantsAround(queenbeetId, 4, 4) >= 8
        return countPlant(jqbId) > 0;
    }

    strategies['inverseStaggeredRings'] = () => {
        M.harvestAll();

        plantUpperQueenbeetRingAround(1, 1);
        plantUpperQueenbeetRingAround(4, 1);
        plantUpperQueenbeetRingAround(1, 4);
        plantUpperQueenbeetRingAround(4, 4);
        tickGarden();
        plantLowerQueenbeetRingAround(1, 1);
        plantLowerQueenbeetRingAround(4, 1);
        plantLowerQueenbeetRingAround(1, 4);
        plantLowerQueenbeetRingAround(4, 4);

        while(countPlant(queenbeetId) > 0) {
            tickGarden();
        }
        return countPlant(jqbId) > 0;
    }

    strategies['fusedSemistaggeredRings'] = () => {
        M.harvestAll();

        plantQueenbeet(0, 4);
        plantQueenbeet(1, 4);
        plantLowerQueenbeetRingAround(3, 3);
        tickGarden();
        plantUpperQueenbeetRingAround(1, 3);
        plantUpperQueenbeetRingAround(3, 3);
        plantLowerQueenbeetRingAround(1, 1);
        plantLowerQueenbeetRingAround(3, 1);
        tickGarden();
        plantUpperQueenbeetRingAround(1, 1);
        plantUpperQueenbeetRingAround(3, 1);

        while(countPlant(queenbeetId) > 0) {
            tickGarden();
        }
        return countPlant(jqbId) > 0;
    }

    strategies['semifusedStaggeredRings'] = () => {
        M.harvestAll();

        plantLowerQueenbeetRingAround(1, 4);
        plantLowerQueenbeetRingAround(3, 3);
        tickGarden();
        plantUpperQueenbeetRingAround(1, 4);
        plantUpperQueenbeetRingAround(3, 3);
        plantLowerQueenbeetRingAround(1, 2);
        plantLowerQueenbeetRingAround(3, 1);
        tickGarden();
        plantUpperQueenbeetRingAround(1, 2);
        plantUpperQueenbeetRingAround(3, 1);

        while(countPlant(queenbeetId) > 0) {
            tickGarden();
        }
        return countPlant(jqbId) > 0;
    }

    if(options.strategy in strategies) {
        currentStrategy = strategies[options.strategy];
    } else {
        throw new Error(`Unknown strategy ${options.strategy}`);
    }
}

async function run1kAttempts(options: Options) {
    let achievements = options.seedlessToNay? ['Seedless to nay'] : [];

    let browser = await chromium.launch({headless: true});
    let page = await openCookieClickerPage(browser, {saveGame: {
        cookies: 1e100,
        prefs: {
            particles: false,
            numbers: false,
            autosave: false,
            autoupdate: false,
            milk: false,
            fancy: false,
            warn: false,
            cursors: false,
            focus: true,
            wobbly: false,
            filters: false,
            showBackupWarning: false,
            timeout: false,
        },
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
                    onMinigame: false,
                },
            },
        },
        achievements,
    }});
    await page.waitForFunction(() => Game.isMinigameReady(Game.Objects['Farm']));

    await page.evaluate(init, options);
    let successes = 0;
    for(let i = 0; i < 1000; i++) {
        successes += Number(await page.evaluate(() => currentStrategy()));
    }

    await page.close();
    await browser.close();
    return successes;
}

setTimeout(async () => {
    let args = process.argv.slice(2);
    console.log(`Running experiment with arguments: ${args}`);
    let options = processCommandLineArgs(args);
    let total = 0;
    for(let i = 0; i < 100; i++) {
        let successes = await run1kAttempts(options);
        console.log(`Attempt ${i+1}: ${successes}`);
        total += successes;
    }
    console.log(`Total: ${total}, ${total/1e5 * 100}%`);
});
