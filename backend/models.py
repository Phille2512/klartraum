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
    beifuss: bool = Field(default=False)  # Beifuß(-Tee) vor dem Schlafen?
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
