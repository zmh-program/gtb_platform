export type Multiword = {
  multiword: string;
  occurrences: {
    theme: string;
    reference: string;
  }[];
};

export type Translation = {
  translation: string;
  is_approved: boolean;
  approved_at: string | null;
};

export type TranslationItem = {
  id: number;
  theme: string;
  shortcut?: string | null;
  multiwords?: Multiword[];
  translations: {
    cs?: Translation;
    da?: Translation;
    de?: Translation;
    en?: Translation;
    es?: Translation;
    fi?: Translation;
    fr?: Translation;
    hu?: Translation;
    it?: Translation;
    ja?: Translation;
    ko?: Translation;
    nl?: Translation;
    no?: Translation;
    pl?: Translation;
    pt?: Translation;
    ro?: Translation;
    ru?: Translation;
    sv?: Translation;
    tr?: Translation;
    uk?: Translation;
    zh_cn?: Translation;
    zh_tw?: Translation;
    co?: Translation;
  };
};
