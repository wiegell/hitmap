import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-search",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./search.component.html",
  styleUrl: "./search.component.scss",
})
export class SearchComponent {
  @Output() textChange = new EventEmitter<string>();
  @Input() set text(str: string) {
    this._searchStr = str;
    this.expanded = !(this._searchStr == "");
  }
  @Output() confirmSearch = new EventEmitter<boolean>();

  @ViewChild("searchInput") searchInput?: ElementRef;
  public expanded = false;

  private _searchStr = "";
  public set searchStr(str: string) {
    this._searchStr = str;
    if (this._searchStr == "") this.expanded = false;
    else this.expanded = true;
    this.textChange.emit(this._searchStr);
  }
  public get searchStr() {
    return this._searchStr;
  }

  public focus() {
    this.expanded = true;
    if (this.searchInput) this.searchInput.nativeElement.focus();
  }

  public blur() {
    if (this.searchStr === "") {
      this.expanded = false;
    }
  }

  public enter() {
    this.confirmSearch.emit(true);
    if (this.searchInput) this.searchInput.nativeElement.blur();
  }
}
