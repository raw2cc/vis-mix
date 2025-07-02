export interface ArticleList {
    article_id: string;
    content_id: string;
    catalog_id: string;
    title: string;
    sort_number: string;
    is_trial: string;
    duration: string;
    duration_str: string;
    media_size: string;
    video_poster: string;
    status: string;
    comment_count: string;
    media_key_full_url: string;
    optional_media_key_full_url: string;
    share_url: string;
    media_type_en: string;
    content_media_type_en: string;
    type: string;
    content_url: string;
    sample_media_full_url?: any;
    is_exper: string;
    is_receive: string;
    is_listened: string;
    listen_percent: string;
    listen_time: string;
    is_finished: string;
    vip_type: string;
    is_vip_expired: string;
    old_vip_type: string;
    is_vip_free: string;
    is_vip_only: string;
    is_purchased: string;
    is_subscribed: string;
    is_limited_free: string;
}

export interface ContentMetaData {
    article_count: string;
    count: string;
    prev_count: string;
    next_count: string;
    min_count: string;
    max_count: string;
    exper_use_num: string;
    exper_num: string;
    article_list: ArticleList[];
}

export interface ContentMetaResponse {
    status: string;
    data?: ContentMetaData;
    message?: String;
}

export interface RelateContent {
    content_id: string;
    type: string;
    author_ids: string;
    title: string;
    background_img: string;
    small_background_img: string;
    author: string;
    subtitle: string;
    discount_price: string;
    complete_class_price: string;
    is_promotion: string;
    media_type: string;
    is_vip_free: string;
    is_vip_only: string;
    is_cron_price: string;
    cron_price_start_time?: any;
    cron_price_end_time?: any;
    cron_price: string;
    promotion_price: string;
    nice_id: string;
    is_purchased: string;
    is_subscribed: string;
    vip_type: string;
    is_limited_free: string;
    content_url: string;
    video_url: string;
    media_type_en: string;
    friend_vip_price: string;
    friend_vip_price_home: string;
    is_friend_vip: string;
    link_url: string;
}

export interface Part {
    article_id: string;
    content_id: string;
    catalog_id: string;
    status: string;
    sample_media_key: string;
    title: string;
    content: string;
    is_trial: string;
    tag: string;
    media_type: string;
    share_desc: string;
    update_date: string;
    relate_content: string;
    duration: string;
    duration_str: string;
    sort_number: string;
    media_size: string;
    video_poster: string;
    comment_count: string;
    part_id: string;
    part_author: string;
    create_ymd_point: string;
    user_collection?: any;
    is_favorite: string;
    tags: any[];
    media_key_full_url: string;
    optional_media_key_full_url: string;
    share_url: string;
    media_type_en: string;
    content_media_type_en: string;
    type: string;
    content_url: string;
    media_files?: any;
    sample_media_full_url: string;
    is_self: string;
    is_self_receive: string;
    vid: string;
    sample_duration_str: string;
    is_share_receive: string;
    card_desc: string;
    last_listened_time: string;
    listen_percent: string;
    play_token: string;
    equity_txt: string;
    equity_txt_url: string;
    equity_close_button: string;
    equity_type: string;
    is_login: string;
    share_free_count: string;
    trial_vip_day: any[];
    is_lock: string;
    is_exper: string;
    exper_num: string;
    exper_use_num: string;
    is_cut_str: string;
}

export interface ArticleMetaData {
    content_id: string;
    author: string;
    avatar: string;
    text_desc: string;
    background_img: string;
    small_background_img: string;
    complete_class_price: string;
    discount_price: string;
    promotion_desc: string;
    is_promotion: string;
    title: string;
    subtitle: string;
    catalog_type: string;
    type: string;
    media_type: string;
    author_id: string;
    author_ids: string;
    is_vip_free: string;
    is_vip_only: string;
    promotion_price: string;
    nice_id: string;
    is_purchased: string;
    is_subscribed: string;
    vip_type: string;
    is_limited_free: string;
    media_type_en: string;
    friend_vip_price: string;
    friend_vip_price_home: string;
    is_friend_vip: string;
    link_url: string;
    catalog_id: string;
    catalog_number: string;
    catalog_title: string;
    user_collection?: any;
    tags: any[];
    video_list?: any;
    relate_contents: RelateContent[];
    is_coupon: string;
    buy_btn_img: string;
    is_vip_expired: string;
    old_vip_type: string;
    notify?: any;
    part: Part[];
}

export interface ArticleMetaResponse {
    status: string;
    data?: ArticleMetaData;
    message?: String;

}