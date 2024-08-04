import { useMemo, useState, type ReactNode } from 'react';
import {
    ComposableMap,
    Marker,
    Geographies,
    Geography,
} from 'react-simple-maps';

import Json_String from 'mcdgriddle-data/src/Json_String.mts';
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
}

export default function App() {
    const [address, set_address] = useState<string>('');
    const [marker_size_lookup, set_marker_size_lookup] = useState<Record<string, number>>(() => {
        // eslint-disable-next-line prefer-const
        let result: Record<string, number> = Object.create(null);
        for (const address in MCD_GEO_COORD_LOOKUP) {
            result[address] = 1;
        }
        return result;
    });
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

                const status = avail.result[address];

                const fill = (() => {
                    switch (status) {
                        case 'AVAILABLE': {
                            return 'green';
                        }
                        case 'OUT_OF_STOCK': {
                            return 'red';
                        }
                        default: {
                            return 'grey'
                        }
                    }
                })();

                result.push(
                    <Marker
                        coordinates={coordinates}
                        fill={fill}
                        onMouseEnter={() => {
                            set_address(address);
                            set_marker_size_lookup((lookup) => ({ ...lookup, [address]: 5 }))
                        }}
                        onMouseLeave={() => {
                            set_marker_size_lookup((lookup) => ({ ...lookup, [address]: 1 }))
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
    } else {
        console.log(Json_String.build(avail.result));
    }

    return (
        <div className='flex-col'>
            <div className='flex-row'>
                <span>Address: {address}</span>
            </div>
            <div className='flex-row'>
                <div className='flex-row-row'>
                    <svg height="30" width="30" xmlns="http://www.w3.org/2000/svg">
                        <circle cx={15} cy={15} r={15} fill="red" />
                    </svg>
                    <span>暫時缺貨</span>
                </div>
                <div className='flex-row-row'>
                    <svg height="30" width="30" xmlns="http://www.w3.org/2000/svg">
                        <circle cx={15} cy={15} r={15} fill="green" />
                    </svg>
                    <span>尚有供應</span>
                </div>
                <div className='flex-row-row'>
                    <svg height="30" width="30" xmlns="http://www.w3.org/2000/svg">
                        <circle cx={15} cy={15} r={15} fill="grey" />
                    </svg>
                    <span>不適用</span>
                </div>
            </div>
            <div style={{ background: '#7CC0DF'}}>

                <ComposableMap
                    projection='geoMercator'
                    projectionConfig={PROJ_CONFIG}
                    style={{ width: '100%', height: 'auto' }}
                >
                    {/* <ZoomableGroup> */}
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
                    {/* </ZoomableGroup> */}
                    {markers}
                </ComposableMap>
            </div>
        </div>
    );
}
