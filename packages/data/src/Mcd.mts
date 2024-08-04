namespace Mcd {
    const STATUS_PAGE_URL_SOURCE = (
        'https://sites.google.com/view/mhk-burger-availability/主頁-home'
    );

    // TODO: Probably won't fix, but do I also want to scrape these as well?
    export const STATUS_PAGE_URL_LIST = [
        `${STATUS_PAGE_URL_SOURCE}/香港島-hk-island/中西區-central-western`,
        `${STATUS_PAGE_URL_SOURCE}/九龍-kowloon/觀塘區-kwun-tong`,
        `${STATUS_PAGE_URL_SOURCE}/新界-new-territories/西貢區-sai-kung`,
        `${STATUS_PAGE_URL_SOURCE}/新界-new-territories/葵青區-kwai-tsing`,
        `${STATUS_PAGE_URL_SOURCE}/離島-islands`,
    ];

    export const LOCATION_API_ENDPOINT = (
        'https://mcdonalds.com.hk/wp-admin/admin-ajax.php?action=get_restaurants'
    );

    export const LOCALE = 'zh';

    export const ZH_ADDRESS_LABEL = '地址';

    export const ZH_AVAIL_LABEL = '供應情況';
}

export default Mcd;
