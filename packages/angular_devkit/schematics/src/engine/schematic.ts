/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import { of as observableOf } from 'rxjs/observable/of';
import { concatMap } from 'rxjs/operators/concatMap';
import { first } from 'rxjs/operators/first';
import { map } from 'rxjs/operators/map';
import { callRule } from '../rules/call';
import { Tree } from '../tree/interface';
import {
  Collection,
  Engine,
  RuleFactory,
  Schematic,
  SchematicDescription,
  TypedSchematicContext,
} from './interface';


export class InvalidSchematicsNameException extends BaseException {
  constructor(name: string) {
    super(`Schematics has invalid name: "${name}".`);
  }
}


export class SchematicImpl<CollectionT extends object, SchematicT extends object>
    implements Schematic<CollectionT, SchematicT> {

  constructor(private _description: SchematicDescription<CollectionT, SchematicT>,
              private _factory: RuleFactory<{}>,
              private _collection: Collection<CollectionT, SchematicT>,
              private _engine: Engine<CollectionT, SchematicT>) {
    if (!_description.name.match(/^[-@/_.a-zA-Z0-9]+$/)) {
      throw new InvalidSchematicsNameException(_description.name);
    }
  }

  get description() { return this._description; }
  get collection() { return this._collection; }

  call<OptionT extends object>(
    options: OptionT,
    host: Observable<Tree>,
    parentContext?: Partial<TypedSchematicContext<CollectionT, SchematicT>>,
  ): Observable<Tree> {
    const context = this._engine.createContext(this, parentContext);

    return host
      .pipe(
        first(),
        concatMap(tree => this._engine.transformOptions(this, options).pipe(
          map(o => [tree, o]),
        )),
        concatMap(([tree, transformedOptions]: [Tree, OptionT]) => {
          return callRule(this._factory(transformedOptions), observableOf(tree), context);
        }),
      );
  }
}