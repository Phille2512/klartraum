import datetime as dt

from sqlmodel import Field, Relationship, SQLModel


class DreamTag(SQLModel, table=True):
    dream_id: int | None = Field(default=None, foreign_key="dream.id", primary_key=True)
    tag_id: int | None = Field(default=None, foreign_key="tag.id", primary_key=True)


class Tag(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    # "tag" = freies Schlagwort, "dream_sign" = wiederkehrendes Traumzeichen
    kind: str = Field(default="tag", index=True)
    # LaBerge-Kategorie für Traumzeichen: awareness | action | form | context
    category: str | None = Field(default=None, index=True)
    # Jung-Archetyp für Personen: schatten | anima_animus | weiser | kind | trickster | held | grosse_mutter | persona
    archetype: str | None = None
    # Gruppierung auf der Traumweltkarte (B.2)
    region_id: int | None = Field(default=None, foreign_key="mapregion.id")

    dreams: list["Dream"] = Relationship(back_populates="tags", link_model=DreamTag)


class Dream(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    date: dt.date = Field(index=True)
    title: str
    content: str = ""
    # 0 = keine Erinnerung, 1 = Fragment, 2 = normaler Traum,
    # 3 = kurz luzide, 4 = voll luzide
    lucidity: int = Field(default=2, ge=0, le=4)
    sleep_quality: int | None = Field(default=None, ge=1, le=5)
    # kommagetrennte Schlüssel: beifuss,melatonin,alkohol,weed — Substanzen vor dem Schlafen
    substances: str | None = None
    substance_other: str | None = None  # Freitext für Substanzen außerhalb der Presets
    emotions: str | None = None  # kommagetrennte Schlüssel: angst,freude,...
    big_dream: bool = Field(default=False)
    # Phänomen-Tracking: klassische Traumphänomene für Muster-/Trainingshinweise
    falsches_erwachen: bool = Field(default=False)
    schlafparalyse: bool = Field(default=False)
    traum_im_traum: bool = Field(default=False)
    wiederkehrend: bool = Field(default=False)
    albtraum: bool = Field(default=False)
    notes_analysis: str | None = None
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

    tags: list[Tag] = Relationship(back_populates="dreams", link_model=DreamTag)


class MapNode(SQLModel, table=True):
    tag_id: int = Field(foreign_key="tag.id", primary_key=True)
    x: float
    y: float


class MapPath(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    from_tag_id: int = Field(foreign_key="tag.id", index=True)
    to_tag_id: int = Field(foreign_key="tag.id", index=True)
    note: str | None = None


class MapRegion(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    color: str = "#8b7ff5"


class Goal(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    text: str
    done: bool = False
    done_at: dt.datetime | None = None
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class Reflection(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    dream_id: int = Field(foreign_key="dream.id", index=True)
    question: str
    answer: str
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class SymbolNote(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    tag_id: int = Field(foreign_key="tag.id", index=True)
    text: str
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class Imagination(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    dream_id: int = Field(foreign_key="dream.id", index=True)
    text: str
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class Intention(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    date: dt.date = Field(index=True)
    text: str
    fulfilled: bool | None = None
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class JourneyStep(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    station: str = Field(index=True)
    note: str | None = None
    completed_at: dt.datetime | None = None


class Night(SQLModel, table=True):
    # N.1: Schlafzeit ist eine Eigenschaft der Nacht, nicht des einzelnen
    # Traums (mehrere Träume pro Nacht möglich). date = Datum des
    # Aufwachens = Traum-Datum.
    # N.4/BACKLOG: für einen späteren Schlaftracker-CSV-Import vorbereitet —
    # der müsste hier nur Zeilen mit confidence="exact" einfügen/upserten,
    # Terzil-Analyse/Aufriss-Split/WBTB-Vorbelegung funktionieren dann mit.
    date: dt.date = Field(primary_key=True)
    bed_time: str | None = None  # "23:15" (HH:MM, Vorabend)
    wake_time: str | None = None  # "06:45" (HH:MM)
    sleep_minutes: int | None = None  # serverseitig abgeleitet, einzige Quelle der Wahrheit
    confidence: str = "exact"  # exact | rough | unknown

    # TD.1: Tracker-Vokabular (UMSETZUNGSPLAN-TRACKERDATEN.md). Alle Felder
    # nullable und additiv -- kommen ausschliesslich aus dem Import (TD.2),
    # die manuelle Erfassung (oben) kennt sie nicht. Phasen-Minuten sind
    # Schaetzungen des Herstellers, keine medizinische Messung.
    source: str = "manual"  # manual | tracker
    rem_minutes: int | None = None
    deep_minutes: int | None = None
    light_minutes: int | None = None
    awake_minutes: int | None = None
    awakenings: int | None = None  # Anzahl Wachphasen
    tracker_score: int | None = None  # herstellereigener Schlaf-Score (0-100), optional
    hr_min: int | None = None  # Puls-Minimum der Nacht
    hr_avg: int | None = None
    hr_max: int | None = None
    sleep_latency_minutes: int | None = None  # ins Bett -> eingeschlafen
    stages_json: str | None = None  # JSON {"segments":[{"s":epoch,"e":epoch,"st":2|3|4|5}],"tz_offset_minutes":int,"hr":[[epoch,bpm],...]}
                                     # tz_offset_minutes (TD.3): noetig, um Segment-Epochs spaeter wieder in Lokalzeit umzurechnen


class DreamAnalysis(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    dream_id: int = Field(foreign_key="dream.id", index=True)
    station: str = Field(index=True)
    answer: str
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)


class SyncEvent(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    dream_id: int | None = Field(default=None, foreign_key="dream.id")
    date: dt.date
    text: str
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)
