import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as React from 'react';
import * as ReactDom from 'react-dom';
import ExpenseVoucher from './components/ExpenseVoucher';
import { IExpenseVoucherProps } from './components/ExpenseVoucherProps';

export interface IExpenseVoucherWebPartProps {}

export default class ExpenseVoucherWebPart extends BaseClientSideWebPart<IExpenseVoucherWebPartProps> {

  public render(): void {
    const element: React.ReactElement<IExpenseVoucherProps> = React.createElement(
      ExpenseVoucher,
      {
        context: this.context
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}
