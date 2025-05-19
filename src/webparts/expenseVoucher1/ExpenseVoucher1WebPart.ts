// import { Version } from '@microsoft/sp-core-library';
// import { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
// import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
// import * as React from 'react';
// import * as ReactDom from 'react-dom';
// import ExpenseVoucher from './components/ExpenseVoucher';
// import { spfi } from "@pnp/sp";
// import { SPFx } from "@pnp/sp/presets/all";

// export interface IExpenseVoucherWebPartProps {}

// export default class ExpenseVoucherWebPart extends BaseClientSideWebPart<IExpenseVoucherWebPartProps> {

//   public static sp: ReturnType<typeof spfi>;

//   public onInit(): Promise<void> {
//     return super.onInit().then(() => {
//       ExpenseVoucherWebPart.sp = spfi().using(SPFx(this.context));
//     });
//   }

//   public render(): void {
//     const element = React.createElement(ExpenseVoucher, {});
//     ReactDom.render(element, this.domElement);
//   }

//   protected onDispose(): void {
//     ReactDom.unmountComponentAtNode(this.domElement);
//   }

//   protected get dataVersion(): Version {
//     return Version.parse('1.0');
//   }

//   protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
//     return {
//       pages: []
//     };
//   }
// }
import { Version } from '@microsoft/sp-core-library';
import { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import ExpenseVoucher from './components/ExpenseVoucher'; // Your ExpenseVoucher component import
import { spfi } from "@pnp/sp";
import { SPFx } from "@pnp/sp/presets/all"; // PnP SPFx preset import

export interface IExpenseVoucherWebPartProps {}

export default class ExpenseVoucherWebPart extends BaseClientSideWebPart<IExpenseVoucherWebPartProps> {
  
  // Static reference to the SP instance for later use
  public static sp: ReturnType<typeof spfi>;

  // Initialization of the WebPart
  public onInit(): Promise<void> {
    return super.onInit().then(() => {
      // Initializing PnP SP instance with SPFx context
      ExpenseVoucherWebPart.sp = spfi().using(SPFx(this.context));
    });
  }

  // Rendering the WebPart's content
  public render(): void {
    // Rendering the ExpenseVoucher React component
    const element = React.createElement(ExpenseVoucher, {
      context: this.context // Passing the context to the React component
    });

    // Rendering the element in the WebPart's DOM
    ReactDom.render(element, this.domElement);
  }

  // Dispose logic for cleaning up any resources
  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  // Version management (for any future updates or version checks)
  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  // Property Pane Configuration (empty for now, but you can add settings in the future)
  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: []
    };
  }
}