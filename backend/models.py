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
    notes_analysis: str | None = None
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

    tags: list[Tag] = Relationship(back_populates="dreams", link_model=DreamTag)
