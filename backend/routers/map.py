"""S.3: Traumweltkarte (Orte, Wege, Regionen), Umzugsarbeit aus main.py."""
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from deps import get_session, require_auth
from models import Dream, MapNode, MapPath, MapRegion, Tag
from schemas import MapNodeIn, MapPathIn, MapRegionIn

router = APIRouter(prefix="/api", dependencies=[Depends(require_auth)])


@router.get("/map")
def get_map(session: Session = Depends(get_session)):
    dreams = session.exec(select(Dream)).all()
    place_tags = session.exec(select(Tag).where(Tag.kind == "place")).all()
    nodes = session.exec(select(MapNode)).all()
    paths = session.exec(select(MapPath)).all()

    tag_dream_count: Counter[int] = Counter()
    tag_lucid_count: Counter[int] = Counter()
    for d in dreams:
        for t in d.tags:
            if t.kind == "place":
                tag_dream_count[t.id] += 1
                if d.lucidity >= 3:
                    tag_lucid_count[t.id] += 1

    node_ids = {n.tag_id for n in nodes}
    tag_map = {t.id: t for t in place_tags}

    placed = []
    for n in nodes:
        tag = tag_map.get(n.tag_id)
        if tag:
            placed.append({
                "tag_id": n.tag_id, "name": tag.name, "x": n.x, "y": n.y,
                "dream_count": tag_dream_count[n.tag_id],
                "lucid_count": tag_lucid_count[n.tag_id],
                "region_id": tag.region_id,
            })

    unplaced = [
        {"tag_id": t.id, "name": t.name, "dream_count": tag_dream_count[t.id]}
        for t in place_tags
        if t.id not in node_ids and tag_dream_count[t.id] > 0
    ]

    path_list = [
        {"id": p.id, "from_tag_id": p.from_tag_id, "to_tag_id": p.to_tag_id, "note": p.note}
        for p in paths
    ]

    regions = session.exec(select(MapRegion)).all()
    region_list = [{"id": r.id, "name": r.name, "color": r.color} for r in regions]

    return {"placed": placed, "unplaced": unplaced, "paths": path_list, "regions": region_list}


@router.post("/map/regions", status_code=201)
def create_map_region(payload: MapRegionIn, session: Session = Depends(get_session)):
    region = MapRegion(name=payload.name.strip(), color=payload.color)
    session.add(region)
    session.commit()
    session.refresh(region)
    for tag_id in payload.tag_ids:
        tag = session.get(Tag, tag_id)
        if tag and tag.kind == "place":
            tag.region_id = region.id
            session.add(tag)
    session.commit()
    return {"id": region.id, "name": region.name, "color": region.color}


@router.delete("/map/regions/{region_id}", status_code=204)
def delete_map_region(region_id: int, session: Session = Depends(get_session)):
    region = session.get(MapRegion, region_id)
    if not region:
        raise HTTPException(404, "region_not_found")
    members = session.exec(select(Tag).where(Tag.region_id == region_id)).all()
    for tag in members:
        tag.region_id = None
        session.add(tag)
    session.delete(region)
    session.commit()


@router.put("/map/nodes/{tag_id}")
def upsert_map_node(tag_id: int, payload: MapNodeIn, session: Session = Depends(get_session)):
    tag = session.get(Tag, tag_id)
    if not tag or tag.kind != "place":
        raise HTTPException(400, "only_places_can_be_placed")
    node = session.get(MapNode, tag_id)
    if node:
        node.x = payload.x
        node.y = payload.y
    else:
        node = MapNode(tag_id=tag_id, x=payload.x, y=payload.y)
    session.add(node)
    session.commit()
    return {"tag_id": tag_id, "x": node.x, "y": node.y}


@router.delete("/map/nodes/{tag_id}", status_code=204)
def delete_map_node(tag_id: int, session: Session = Depends(get_session)):
    node = session.get(MapNode, tag_id)
    if not node:
        raise HTTPException(404, "node_not_found")
    paths = session.exec(
        select(MapPath).where((MapPath.from_tag_id == tag_id) | (MapPath.to_tag_id == tag_id))
    ).all()
    for p in paths:
        session.delete(p)
    session.delete(node)
    session.commit()


@router.post("/map/paths", status_code=201)
def create_map_path(payload: MapPathIn, session: Session = Depends(get_session)):
    if not session.get(MapNode, payload.from_tag_id) or not session.get(MapNode, payload.to_tag_id):
        raise HTTPException(400, "both_places_must_be_placed")
    existing = session.exec(
        select(MapPath).where(
            ((MapPath.from_tag_id == payload.from_tag_id) & (MapPath.to_tag_id == payload.to_tag_id)) |
            ((MapPath.from_tag_id == payload.to_tag_id) & (MapPath.to_tag_id == payload.from_tag_id))
        )
    ).first()
    if existing:
        raise HTTPException(409, "path_already_exists")
    path = MapPath(from_tag_id=payload.from_tag_id, to_tag_id=payload.to_tag_id, note=payload.note)
    session.add(path)
    session.commit()
    session.refresh(path)
    return {"id": path.id, "from_tag_id": path.from_tag_id, "to_tag_id": path.to_tag_id, "note": path.note}


@router.delete("/map/paths/{path_id}", status_code=204)
def delete_map_path(path_id: int, session: Session = Depends(get_session)):
    path = session.get(MapPath, path_id)
    if not path:
        raise HTTPException(404, "path_not_found")
    session.delete(path)
    session.commit()
