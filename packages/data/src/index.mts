import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import timers from 'node:timers/promises';

import he from 'he';
import minimist from 'minimist';

import Callback_Timer from './Callback_Timer.mjs';
import Json_String from './Json_String.mjs';
import Mcd from './Mcd.mjs';
import scrape_table_content_from from './scrape_table_content_from.mjs';

async function main() {
    const DIST_DIR = path.resolve('dist');
    if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(path.resolve('dist'));
    }

    const argv = minimist(process.argv.slice(2));

    const has_no_flags = Flag.LIST.every((flag) => !argv[flag]);
    if (has_no_flags) {
        console.warn(`Missing flag. Pick any one from [${Flag.LIST.join(', ')}] and rerun.`);
        process.exit(1);
    }

    const flag_count = Flag.LIST.reduce((acc, cur) => acc + Number(argv[cur] ?? 0), 0);
    if (flag_count !== 1) {
        console.warn(
            `Too many flags. Pick exactly one from [${Flag.LIST.join(', ')}] and rerun.`
        );
        process.exit(1);
    }

    if (argv[Flag.HELP]) {
        console.warn('[TODO]: write something for script usage.');
        process.exit(1);
    }

    const excel_url_list = (
        await Callback_Timer.wrap(fetch_excel_url_list_from)(Mcd.STATUS_PAGE_URL_LIST)
    );
    const excel_url_list_file_name = path.resolve(DIST_DIR, 'excel_url_list.json');
    fs.writeFileSync(excel_url_list_file_name, Json_String.build(excel_url_list));

    if (argv[Flag.ADDRESS_LIST]) {
        return;
    }

    const address_list = await Callback_Timer.wrap(scrape_address_list_from)(excel_url_list);
    const address_list_file_name = path.resolve(DIST_DIR, 'address_list.json');
    fs.writeFileSync(address_list_file_name, Json_String.build(address_list));

    if (argv[Flag.EXCEL_URL_LIST]) {
        return;
    }

    const geo_coord_lookup = await Callback_Timer.wrap(fetch_geo_coord_lookup_from)(address_list);
    const geo_coord_lookup_file_name = path.resolve(DIST_DIR, 'geo_coord_lookup.json');
    fs.writeFileSync(geo_coord_lookup_file_name, Json_String.build(geo_coord_lookup));
}

async function fetch_geo_coord_lookup_from(address_list: string[]) {
    // eslint-disable-next-line prefer-const
    let geo_coord_lookup_lookup: Record<string, [number, number]> = Object.create(null);

    const chunk_size = 20;
    for (let i = 0; i < address_list.length; i += chunk_size) {
        const address_sublist = address_list.slice(i, i + chunk_size);

        if (i !== 0) {
            await timers.setTimeout(500);
        }

        await Promise.all(address_sublist.map(async (address) => {
            const response = await fetch(Mcd.LOCATION_API_ENDPOINT, {
                body: `type=location&location=${address}`,
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
            });

            const response_json = await response.json() as unknown;

            if (!TypeCheck.is_object(response_json)) {
                throw new Error(`Invalid response format, ${Json_String.build({ address })}`);
            }

            if (!('restaurants' in response_json) || !Array.isArray(response_json.restaurants)) {
                const failure = Json_String.build({ address, response_json });
                throw new Error(`Invalid response format, ${failure}`);
            }

            const [target_restaurant] = response_json.restaurants.sort((a, b) => (
                (a?.distance ?? Number.MAX_SAFE_INTEGER)
                - (b?.distance ?? Number.MAX_SAFE_INTEGER)
            )) as unknown[];

            if (!TypeCheck.is_object(target_restaurant)) {
                const failure = Json_String.build({ address });
                throw new Error(`Invalid target_restaurant object, ${failure}`);
            }

            if (!('lng' in target_restaurant) || typeof target_restaurant.lng !== 'number') {
                const failure = Json_String.build({ address, target_restaurant });
                throw new Error(`Invalid longitude, ${failure}`);
            }

            if (!('lat' in target_restaurant) || typeof target_restaurant.lat !== 'number') {
                const failure = Json_String.build({ address, target_restaurant });
                throw new Error(`Invalid latitude, ${failure}`);
            }

            geo_coord_lookup_lookup[address] = [target_restaurant.lng, target_restaurant.lat];
        }));
    }

    return geo_coord_lookup_lookup;
}

async function scrape_address_list_from(excel_url_list: string[]) {
    const nested_address_promise_list = excel_url_list.map(scrape_address_from);
    const nested_address_list = await Promise.all(nested_address_promise_list);
    const unsorted_address_list = nested_address_list.flat();
    return unsorted_address_list.sort((a, b) => a.localeCompare(b, Mcd.LOCALE));
}

async function scrape_address_from(excel_url: string) {
    const excel_content = await fetch(excel_url).then(res => res.text());

    const table_content = scrape_table_content_from(excel_content);
    return table_content.flatMap(({ header_cell_match_list, content_cell_match_grid }) => {
        const address_pos = (
            header_cell_match_list.findIndex(({ groups }) => groups?.cell === Mcd.ZH_ADDRESS_LABEL)
        );
        if (address_pos === -1) {
            const failure = Json_String.build({ header_cell_match_list, address_pos });
            console.warn(`Cannot find address column from header row, ${failure}`);
            return [];
        }

        return content_cell_match_grid.flatMap(({ content_row, content_cell_match_list }) => {
            const address = content_cell_match_list[address_pos]?.groups?.cell;
            if (!address) {
                const failure = Json_String.build({ content_row, address_pos });
                console.warn(`Cannot obtain address from table row, ${failure}`);

                return [];
            }

            return he.decode(address).replace(/<br>/g, '');
        });
    });
}

async function fetch_excel_url_list_from(url_list: string[]) {
    return await Promise.all(url_list.map(scrape_excel_url_from));
}

async function scrape_excel_url_from(url: string) {
    const html = await fetch(url).then(res => res.text());

    const iframe_content_match = html.match(/&lt;iframe(?<iframe_content>.*?)\/iframe&gt;/);
    const iframe_content = iframe_content_match?.groups?.iframe_content;
    if (!iframe_content) {
        throw new Error(`Cannot get iframe content, ${Json_String.build({ html })}`);
    }

    const excel_url_match = iframe_content.match(/src=&quot;(?<excel_url>.*?)&quot;/);
    const excel_url = excel_url_match?.groups?.excel_url;
    if (!excel_url) {
        throw new Error(`Cannot get excel URI, ${Json_String.build({ iframe_content })}`);
    }

    return excel_url;
}

class TypeCheck {
    static is_object(obj: unknown): obj is object {
        return typeof obj === 'object' && !Array.isArray(obj) && obj !== null;
    }
}

class Flag {
    static HELP = 'help' as const;
    static EXCEL_URL_LIST = 'excel-url-list' as const;
    static ADDRESS_LIST = 'address-list' as const;
    static GEO_COORD_LOOKUP = 'geo-coord-lookup' as const;
    static LIST = [
        Flag.HELP,
        Flag.EXCEL_URL_LIST,
        Flag.ADDRESS_LIST,
        Flag.GEO_COORD_LOOKUP,
    ] as const;
}

Callback_Timer.call(main).catch(error => {
    console.error(error);
    process.exit(1);
});
