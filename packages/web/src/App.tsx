import { useMemo, useState, type ReactNode } from 'react';
import {
    ComposableMap,
    Marker,
    Geographies,
    Geography,
} from 'react-simple-maps';
import MCD_GEO_COORD_LOOKUP from 'mcdgriddle-data/dist/geo_coord_lookup.json';

import useHook_prod_avail_lookup from './use_prod_avail_lookup';

import HK_TOPO_MAP from './hk-topo-map.json';

import './style.css';

const HK_COORD = [114.1694, 22.3193] as const satisfies [number, number];
const MAP_SCALE = 66690;
const PROJ_CONFIG = { scale: MAP_SCALE, center: HK_COORD };
const GEO_STYLE_DEFAULT = { outline: 'none', fill: '#dddddd' };
const GEO_STYLE = {
    default: GEO_STYLE_DEFAULT,
    hover: GEO_STYLE_DEFAULT,
    pressed: GEO_STYLE_DEFAULT,
} as const;
const circle_props = [
    { status: 'AVAILABLE', fill: 'green', label: '尚有供應' },
    { status: 'OUT_OF_STOCK', fill: 'red', label: '暫時缺貨' },
    { status: 'NOT_AVAILABLE', fill: 'grey', label: '不適用' },
] as const;

const make_init_marker_size_lookup = (): Record<string, number> => {
    // eslint-disable-next-line prefer-const
    let result: Record<string, number> = Object.create(null);
    for (const address in MCD_GEO_COORD_LOOKUP) {
        result[address] = 1;
    }
    return result;
};

export default function App() {
    const [address, set_address] = useState<string>('');


    const [marker_size_lookup, set_marker_size_lookup] = useState(make_init_marker_size_lookup);
    const avail = useHook_prod_avail_lookup();

    const markers = useMemo(
        () => {
            if (avail.loading) {
                return [];
            }
            // eslint-disable-next-line prefer-const
            let result: ReactNode[] = [];
            for (const _address in MCD_GEO_COORD_LOOKUP) {
                const address = _address as keyof typeof MCD_GEO_COORD_LOOKUP;
                const coordinates = MCD_GEO_COORD_LOOKUP[address] as [number, number];

                const { fill } = circle_props.find(prop => prop.status === avail.result[address])!;

                result.push(
                    <Marker
                        coordinates={coordinates}
                        fill={fill}
                        onClick={() => {
                            set_address(address);
                            set_marker_size_lookup(({
                                ...make_init_marker_size_lookup(),
                                [address]: 5,
                            }));
                        }}
                    >
                        <circle cx={0} cy={0} r={marker_size_lookup[address]} />
                    </Marker>
                )
            }
            return result;
        },
        [avail, marker_size_lookup],
    )

    if (avail.loading) {
        return "Loading..."
    }

    return (
        <div className='flex-col'>
            <div className='flex-row'>
                點擊下圖任一圖標查詢售賣狀況。
            </div>
            <hr />
            <div className='flex-row'>
                <span>地址: {address}</span>
            </div>
            <div className='flex-row'>
                {circle_props.map(({ status, fill, label }) => (
                    <div
                        className={(
                            [
                                'flex-row-row',
                                status === avail.result[address] ? 'flex-row-row--active' : ''
                            ]
                                .join(' ')
                        )}
                    >
                        <svg height="30" width="30" xmlns="http://www.w3.org/2000/svg">
                            <circle cx={15} cy={15} r={15} fill={fill} />
                        </svg>
                        <span>{label}</span>
                    </div>
                ))}
            </div>
            <div style={{ background: '#7CC0DF'}}>

                <ComposableMap
                    projection='geoMercator'
                    projectionConfig={PROJ_CONFIG}
                    style={{ width: '100%', height: 'auto' }}
                >
                    <Geographies geography={HK_TOPO_MAP}>
                        {({ geographies }) =>
                            geographies.map((geo) => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    style={GEO_STYLE}
                                    fill="#34A56F"
                                />
                            ))
                        }
                    </Geographies>
                    {markers}
                </ComposableMap>
            </div>
        </div>
    );
}
