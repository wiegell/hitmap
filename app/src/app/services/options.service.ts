import { Injectable } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import {
  GeneralOptions,
  optionsQueryParamName,
  queryParam,
  ZoomOptions,
  ZoomOptionsI,
  zoomQueryParamName,
} from "./options.model";
import {
  BehaviorSubject,
  debounce,
  debounceTime,
  map,
  Observable,
  skip,
  tap,
} from "rxjs";
import { cloneDeep } from "lodash-es";
import { ZoomTransform } from "d3";

@Injectable({
  providedIn: "root",
})
export class OptionsService {
  // private optionsSubject: BehaviorSubject<Options>;
  // public options$: Observable<OptionsI>;

  private zoomSubject: BehaviorSubject<ZoomOptionsI>;
  public zoom$: Observable<ZoomOptionsI>;

  constructor(private router: Router, private route: ActivatedRoute) {
    // Load options from url if present
    const zoomParam = this.getZoomParam();
    let zoomOptions: ZoomOptions;
    if (zoomParam != null && zoomParam != "") {
      console.log("from", zoomParam);
      zoomOptions = ZoomOptions.fromBase64UrlEncoded(zoomParam);
    } else {
      zoomOptions = new ZoomOptions(1, 0, 0);
    }

    // Init zoom subject
    this.zoomSubject = new BehaviorSubject(zoomOptions as ZoomOptionsI);
    this.zoom$ = this.zoomSubject.asObservable();

    // Init options observable
    // this.options$ = this.optionsSubject.pipe(
    // );

    // Update url on options changes
    console.log("constructor");
    this.zoom$.pipe(debounceTime(200)).subscribe((options) => {
      console.log("debounced options", options);
      if (options instanceof ZoomOptions) this.setZoomParam(options);
      else {
        const zoomOptions = new ZoomOptions(options.k, options.x, options.y);
        this.setZoomParam(zoomOptions);
      }
    });
  }

  // Url handling

  private getOptionsParam(): string | null {
    // URLSearchParams is used over angular routing
    // because it works in constructor before angular router initialization
    return new URLSearchParams(window.location.search).get(
      optionsQueryParamName
    );
  }

  private setOptionsParam(options: GeneralOptions): void {
    const optionsParam: queryParam = { options: "" };
    optionsParam.options = options.base64UrlEncode() ?? "";
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: optionsParam,
      queryParamsHandling: "merge",
    });
  }

  private getZoomParam(): string | null {
    // URLSearchParams is used over angular routing
    // because it works in constructor before angular router initialization
    return new URLSearchParams(window.location.search).get(zoomQueryParamName);
  }

  private setZoomParam(options: ZoomOptions): void {
    const zoomParam: queryParam = { zoom: "" };
    zoomParam.zoom = options.base64UrlEncode() ?? "";
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: zoomParam,
      queryParamsHandling: "merge",
    });
  }

  // Value accessors

  public zoomTransform(zoomTransform: ZoomTransform) {
    this.zoomSubject.next(zoomTransform);
  }
}
