"""S.3: Pydantic-Schemas (API-Eingabe/-Ausgabe), reine Umzugsarbeit aus main.py."""
import datetime as dt

from pydantic import BaseModel, Field as PField


class PasswordIn(BaseModel):
    password: str = PField(min_length=4)


class DreamIn(BaseModel):
    date: dt.date
    title: str
    content: str = ""
    lucidity: int = PField(default=2, ge=0, le=4)
    sleep_quality: int | None = PField(default=None, ge=1, le=5)
    substances: list[str] = []
    substance_other: str | None = None
    big_dream: bool = False
    falsches_erwachen: bool = False
    schlafparalyse: bool = False
    traum_im_traum: bool = False
    wiederkehrend: bool = False
    albtraum: bool = False
    emotions: list[str] = []
    notes_analysis: str | None = None
    tags: list[str] = []
    dream_signs: list[str] = []
    places: list[str] = []
    persons: list[str] = []


class DreamOut(BaseModel):
    id: int
    date: dt.date
    title: str
    content: str
    lucidity: int
    sleep_quality: int | None
    substances: list[str]
    substance_other: str | None
    big_dream: bool
    falsches_erwachen: bool
    schlafparalyse: bool
    traum_im_traum: bool
    wiederkehrend: bool
    albtraum: bool
    emotions: list[str]
    notes_analysis: str | None
    tags: list[str]
    dream_signs: list[str]
    places: list[str]
    persons: list[str]


class CategoryIn(BaseModel):
    category: str | None = PField(default=None, pattern="^(awareness|action|form|context)$")


class ArchetypeIn(BaseModel):
    archetype: str | None = None


class TagRegionIn(BaseModel):
    region_id: int | None = None


class SymbolNoteIn(BaseModel):
    text: str = PField(min_length=1)


class GoalIn(BaseModel):
    text: str = PField(min_length=1)


class GoalToggle(BaseModel):
    done: bool


class IntentionIn(BaseModel):
    text: str = PField(min_length=1)


class IntentionFulfill(BaseModel):
    fulfilled: bool


class MapNodeIn(BaseModel):
    x: float = PField(ge=0, le=1)
    y: float = PField(ge=0, le=1)


class MapPathIn(BaseModel):
    from_tag_id: int
    to_tag_id: int
    note: str | None = None


class MapRegionIn(BaseModel):
    name: str = PField(min_length=1)
    color: str = PField(default="#8b7ff5")
    tag_ids: list[int] = []


class ReflectionIn(BaseModel):
    question: str
    answer: str = PField(min_length=1)


class ImaginationIn(BaseModel):
    text: str = PField(min_length=1)


class DreamAnalysisIn(BaseModel):
    station: str
    answer: str = PField(min_length=1)


class SyncEventIn(BaseModel):
    dream_id: int | None = None
    date: dt.date
    text: str = PField(min_length=1)


class NightIn(BaseModel):
    # Genau ein Modus pro Request: (bed_time + wake_time) | bucket | unknown.
    # Validierung im Router (nicht hier), damit ungültige Kombinationen den
    # einheitlichen "err.*"-Fehlercode "invalid_night_payload" bekommen statt
    # einer generischen Pydantic-Fehlermeldung.
    bed_time: str | None = None
    wake_time: str | None = None
    bucket: str | None = None
    unknown: bool | None = None
