import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { DataEntry } from "../models/data.model";

@Injectable({
  providedIn: "root",
})
export class SelectionService {
  // Selected
  private _selectedNode = new BehaviorSubject<DataEntry | undefined>(undefined);
  public setSelectedNode(node: DataEntry | undefined) {
    this._selectedNode.next(node);
  }
  public selectedNode$ = this._selectedNode.asObservable();
  public get selectedNode() {
    return this._selectedNode.value;
  }

  // Hovered
  private hoveredNode = new BehaviorSubject<DataEntry | undefined>(undefined);
  public setHoveredNode(node: DataEntry | undefined) {
    this.hoveredNode.next(node);
  }
  public hoveredNode$ = this.hoveredNode.asObservable();

  // Active
  private activeNode = new BehaviorSubject<DataEntry | undefined>(undefined);
  public setActiveNode(node: DataEntry | undefined) {
    console.log("setting active", node);
    this.activeNode.next(node);
  }
  public activeNode$ = this.activeNode.asObservable();
}
