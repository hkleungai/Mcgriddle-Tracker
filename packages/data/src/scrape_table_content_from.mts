import Json_String from "./Json_String.mjs";

export default function scrape_table_content_from(html: string) {
    const tbody_match_list = [
        ...html.matchAll(/<tbody>(?<tbody>.*?)<\/tbody>/g)
    ];

    return tbody_match_list.flatMap((tbody_match) => {
        const tbody = tbody_match.groups?.tbody;
        if (!tbody) {
            const failure = Json_String.build({ tbody_match, html });
            throw new Error(`Cannot get tbody from excel, ${failure}`);
        }

        const row_match_list = [...tbody.matchAll(/<tr(?:.*?)>(?<row>.*?)<\/tr>/g)];
        if (row_match_list.length < 2) {
            const failure = Json_String.build({ tbody });
            throw new Error(`cannot get both header row and content row, ${failure}`);
        }

        const [first_row_match, ...content_row_match_list] = row_match_list;

        const first_row = first_row_match.groups?.row;
        if (!first_row) {
            throw new Error(
                `Cannot get first row from tbody, ${Json_String.build({ tbody })}`
            );
        }
        const header_cell_match_list = [...first_row.matchAll(/<td(?:.*?)>(?<cell>.*?)<\/td>/g)];

        const content_cell_match_grid = content_row_match_list.map((content_row_match) => {
            const content_row = content_row_match.groups?.row;
            if (!content_row) {
                const failure = Json_String.build({ tbody, content_row_match });
                throw new Error(`Cannot get table row from tbody, ${failure}`);
            }

            const content_cell_match_list = (
                [...content_row.matchAll(/<td(?:.*?)>(?<cell>.*?)<\/td>/g)]
            );
            if (content_cell_match_list.length === 0) {
                const failure = Json_String.build({ content_row });
                throw new Error(`Cannot get cell from table row, ${failure}`);
            }

            return { content_row, content_cell_match_list };
        });

        return {
            header_cell_match_list,
            content_cell_match_grid,
        }
    })
}
