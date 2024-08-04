import { useEffect, useState } from 'react';
import he from 'he';
import Json_String from 'mcdgriddle-data/src/Json_String.mjs';
import Mcd from 'mcdgriddle-data/src/Mcd.mjs';
import scrape_table_content_from from 'mcdgriddle-data/src/scrape_table_content_from.mjs';

import EXCEL_URL_LIST from 'mcdgriddle-data/dist/excel_url_list.json';

type Avail_Status = 'AVAILABLE' | 'OUT_OF_STOCK' | 'NOT_AVAILABLE';

export default function useHook_prod_avail_lookup(): (
    | { loading: true }
    | { loading: false, result: Record<string, string> }
) {
    const [result, set_result] = useState<Record<string, string>>();
    const [loading, set_loading] = useState(false);

    useEffect(() => {
        const ac = new AbortController();

        const request = async () => {
            set_loading(true);

            const updated = await Promise.all(EXCEL_URL_LIST.map(async (url) => {
                const response = await fetch(url, { signal: ac.signal });
                const excel_content = await response.text();

                const table_content = scrape_table_content_from(excel_content);
                return table_content.flatMap(({ header_cell_match_list, content_cell_match_grid }) => {
                    const address_pos = header_cell_match_list.findIndex(({ groups }) => (
                        groups?.cell === Mcd.ZH_ADDRESS_LABEL
                    ));
                    if (address_pos === -1) {
                        const failure = Json_String.build({ header_cell_match_list, address_pos });
                        console.warn(`Cannot find availability column from header row, ${failure}`);
                        return [];
                    }

                    const avail_pos = header_cell_match_list.findIndex(({ groups }) => (
                        groups?.cell?.includes(Mcd.ZH_AVAIL_LABEL)
                    ));
                    if (avail_pos === -1) {
                        const failure = Json_String.build({ header_cell_match_list, avail_pos });
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

                        const decoded_address = he.decode(address).replace(/<br>/g, '');

                        const avail = content_cell_match_list[avail_pos]?.groups?.cell;
                        if (!avail) {
                            const failure = Json_String.build({ content_row, avail_pos });
                            console.warn(`Cannot obtain availability from table row, ${failure}`);

                            return [];
                        }

                        const status: Avail_Status = (() => {
                            if (avail.includes('尚有供應')) {
                                return 'AVAILABLE';
                            }
                            if (avail.includes('暫時缺貨')) {
                                return 'OUT_OF_STOCK';
                            }
                            return 'NOT_AVAILABLE'
                        })();

                        return [[decoded_address, status]];
                    });
                });
            }));

            set_result(Object.fromEntries(updated.flat()));

            set_loading(false);

            return () => {
                console.count('run');
                ac.abort();
            }
        }

        request();
    }, []);

    return (!loading && result) ? { loading: false, result } : { loading: true };
}
