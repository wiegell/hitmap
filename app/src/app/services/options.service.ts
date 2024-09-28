import { Injectable } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { ZoomTransform } from "d3";
import { cloneDeep } from "lodash-es";
import { BehaviorSubject, debounceTime, Observable } from "rxjs";
import {
  GeneralOptions,
  optionsQueryParamName,
  queryParam,
  ZoomOptions,
  ZoomOptionsI,
  zoomQueryParamName,
} from "./options.model";
import { Filter } from "./search.model";

@Injectable({
  providedIn: "root",
})
export class OptionsService {
  private generalOptionsSubject: BehaviorSubject<GeneralOptions>;
  public generalOptions$: Observable<GeneralOptions>;

  private zoomSubject: BehaviorSubject<ZoomOptionsI>;
  public zoom$: Observable<ZoomOptionsI>;

  constructor(private router: Router, private route: ActivatedRoute) {
    // Load options from url if present
    const zoomParam = this.getZoomParam();
    const generalOptionsParam = this.getOptionsParam();
    let zoomOptions: ZoomOptions;
    let generalOptions: GeneralOptions;
    if (zoomParam != null && zoomParam != "") {
      zoomOptions = ZoomOptions.fromBase64UrlEncoded(zoomParam);
    } else {
      zoomOptions = new ZoomOptions(1, 0, 0);
    }
    if (generalOptionsParam != null && generalOptionsParam != "") {
      generalOptions = GeneralOptions.fromBase64UrlEncoded(generalOptionsParam);
    } else {
      generalOptions = new GeneralOptions();
    }

    // Init zoom subject
    this.zoomSubject = new BehaviorSubject(zoomOptions as ZoomOptionsI);
    this.zoom$ = this.zoomSubject.asObservable();

    // Init options observable
    this.generalOptionsSubject = new BehaviorSubject(generalOptions);
    this.generalOptions$ = this.generalOptionsSubject.asObservable();

    // Update url on options changes
    this.zoom$.pipe(debounceTime(200)).subscribe((options) => {
      if (options instanceof ZoomOptions) this.setZoomParam(options);
      else {
        const zoomOptions = new ZoomOptions(options.k, options.x, options.y);
        this.setZoomParam(zoomOptions);
      }
    });
    this.generalOptions$.pipe(debounceTime(500)).subscribe((generalOptions) => {
      if (generalOptions instanceof GeneralOptions)
        this.setOptionsParam(generalOptions);
      else {
        throw new Error("invalid general options", generalOptions);
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

  public addFilter(filter: Filter) {
    const clonedOptions = cloneDeep(this.generalOptionsSubject.value);
    clonedOptions.addFilter(filter);
    this.generalOptionsSubject.next(clonedOptions);
  }
  public removeFilter(filter: Filter) {
    const clonedOptions = cloneDeep(this.generalOptionsSubject.value);
    clonedOptions.removeFilter(filter);
    this.generalOptionsSubject.next(clonedOptions);
  }
}
