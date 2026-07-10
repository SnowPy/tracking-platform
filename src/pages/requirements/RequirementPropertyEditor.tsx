import { Button, Divider, Input, Select, Space, Switch, Tag, Tooltip, Typography } from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import PropertyTypeTag from '../../components/PropertyTypeTag'
import type { EventProperty, PropertyAction, ProposedProperty } from '../../types'

const { Text } = Typography
const { TextArea } = Input

export type PropertyEditorField = 'name' | 'display_name' | 'type' | 'description' | 'required'
export type PropertyEditorValue = string | boolean

interface PropertyTypeOption {
  value: string
  label: string
}

interface RequirementPropertyEditorProps {
  projectId: string
  existingProperties: EventProperty[]
  propertyActions: Record<string, PropertyAction>
  propertyModifications: Record<string, Partial<EventProperty>>
  newProperties: ProposedProperty[]
  typeOptions: PropertyTypeOption[]
  generatingNewIndex: number | null
  generatingExistingId: string | null
  isAppendingToExistingEvent: boolean
  onStartModify: (property: EventProperty) => void
  onSetExistingAction: (propertyId: string, action: PropertyAction) => void
  onUpdateExisting: (propertyId: string, field: PropertyEditorField, value: PropertyEditorValue) => void
  onGenerateExistingName: (propertyId: string, displayName: string) => void
  onAddNew: () => void
  onUpdateNew: (index: number, field: PropertyEditorField, value: PropertyEditorValue) => void
  onGenerateNewName: (index: number) => void
  onRemoveNew: (index: number) => void
}

function getActionMeta(action: PropertyAction) {
  if (action === 'modify') return { color: 'orange', label: '待修改' }
  if (action === 'delete') return { color: 'red', label: '待删除' }
  return { color: 'default', label: '保留' }
}

export default function RequirementPropertyEditor({
  projectId,
  existingProperties,
  propertyActions,
  propertyModifications,
  newProperties,
  typeOptions,
  generatingNewIndex,
  generatingExistingId,
  isAppendingToExistingEvent,
  onStartModify,
  onSetExistingAction,
  onUpdateExisting,
  onGenerateExistingName,
  onAddNew,
  onUpdateNew,
  onGenerateNewName,
  onRemoveNew,
}: RequirementPropertyEditorProps) {
  return (
    <>
      {existingProperties.length > 0 ? (
        <>
          <Divider titlePlacement="start" plain>
            已有属性变更（{existingProperties.length}）
          </Divider>
          <div className="requirement-property-editor-list">
            {existingProperties.map((property) => {
              const action = propertyActions[property.id] || 'keep'
              const actionMeta = getActionMeta(action)
              const modification = propertyModifications[property.id]
              const displayName = modification?.display_name ?? property.display_name ?? ''
              const technicalName = modification?.name ?? property.name

              return (
                <div
                  key={property.id}
                  className={`requirement-property-editor-item requirement-property-editor-item-${action}`}
                >
                  <div className="requirement-property-summary">
                    <div className="requirement-property-identity">
                      <Text code ellipsis>{property.name}</Text>
                      <Text type="secondary" ellipsis>{property.display_name || '未填写显示名'}</Text>
                    </div>
                    <Space size={4} wrap>
                      <PropertyTypeTag type={property.type} projectId={projectId} />
                      {property.required ? <Tag color="red">必填</Tag> : <Tag>可选</Tag>}
                    </Space>
                    <Space size={4} className="requirement-property-actions">
                      <Tag color={actionMeta.color}>{actionMeta.label}</Tag>
                      {action === 'delete' ? (
                        <Tooltip title="撤销删除">
                          <Button
                            type="text"
                            size="small"
                            icon={<UndoOutlined />}
                            aria-label={`撤销删除 ${property.name}`}
                            onClick={() => onSetExistingAction(property.id, 'keep')}
                          />
                        </Tooltip>
                      ) : (
                        <>
                          <Tooltip title={action === 'modify' ? '继续编辑' : '修改属性'}>
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              aria-label={`修改属性 ${property.name}`}
                              onClick={() => onStartModify(property)}
                            />
                          </Tooltip>
                          <Tooltip title="标记删除">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              aria-label={`删除属性 ${property.name}`}
                              onClick={() => onSetExistingAction(property.id, 'delete')}
                            />
                          </Tooltip>
                          {action === 'modify' ? (
                            <Tooltip title="撤销修改">
                              <Button
                                type="text"
                                size="small"
                                icon={<UndoOutlined />}
                                aria-label={`撤销修改 ${property.name}`}
                                onClick={() => onSetExistingAction(property.id, 'keep')}
                              />
                            </Tooltip>
                          ) : null}
                        </>
                      )}
                    </Space>
                  </div>

                  {action === 'modify' ? (
                    <div className="requirement-property-editor-grid">
                      <label className="requirement-property-field">
                        <span>显示名</span>
                        <Input
                          value={displayName}
                          onChange={(event) => onUpdateExisting(property.id, 'display_name', event.target.value)}
                        />
                      </label>
                      <label className="requirement-property-field">
                        <span>属性名</span>
                        <Input
                          value={technicalName}
                          onChange={(event) => onUpdateExisting(property.id, 'name', event.target.value)}
                          suffix={(
                            <ThunderboltOutlined
                              spin={generatingExistingId === property.id}
                              title="AI 生成属性名"
                              onClick={() => onGenerateExistingName(property.id, displayName || property.name)}
                            />
                          )}
                        />
                      </label>
                      <label className="requirement-property-field">
                        <span>类型</span>
                        <Select
                          value={modification?.type || property.type}
                          options={typeOptions}
                          onChange={(value) => onUpdateExisting(property.id, 'type', value)}
                        />
                      </label>
                      <div className="requirement-property-field requirement-property-required">
                        <span>是否必填</span>
                        <Switch
                          checked={modification?.required ?? property.required}
                          checkedChildren="必填"
                          unCheckedChildren="可选"
                          onChange={(value) => onUpdateExisting(property.id, 'required', value)}
                        />
                      </div>
                      <label className="requirement-property-field requirement-property-description">
                        <span>说明</span>
                        <TextArea
                          rows={2}
                          value={modification?.description ?? property.description ?? ''}
                          onChange={(event) => onUpdateExisting(property.id, 'description', event.target.value)}
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      ) : null}

      <Divider titlePlacement="start" plain>
        {isAppendingToExistingEvent ? '新增属性（追加到事件）' : '新增属性'}
      </Divider>
      <div className="requirement-property-editor-list">
        {newProperties.map((property, index) => (
          <div key={index} className="requirement-property-editor-item">
            <div className="requirement-property-editor-grid requirement-property-editor-grid-new">
              <label className="requirement-property-field">
                <span>显示名</span>
                <Input
                  placeholder="如：点击位置"
                  value={property.display_name || ''}
                  onChange={(event) => onUpdateNew(index, 'display_name', event.target.value)}
                />
              </label>
              <label className="requirement-property-field">
                <span>属性名</span>
                <Input
                  placeholder="如 click_location"
                  value={property.name}
                  onChange={(event) => onUpdateNew(index, 'name', event.target.value)}
                  suffix={(
                    <ThunderboltOutlined
                      spin={generatingNewIndex === index}
                      title="AI 生成属性名"
                      onClick={() => onGenerateNewName(index)}
                    />
                  )}
                />
              </label>
              <label className="requirement-property-field">
                <span>类型</span>
                <Select
                  value={property.type}
                  options={typeOptions}
                  onChange={(value) => onUpdateNew(index, 'type', value)}
                />
              </label>
              <div className="requirement-property-field requirement-property-required">
                <span>是否必填</span>
                <Switch
                  checked={property.required}
                  checkedChildren="必填"
                  unCheckedChildren="可选"
                  onChange={(value) => onUpdateNew(index, 'required', value)}
                />
              </div>
              <Tooltip title="删除属性">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  className="requirement-property-remove"
                  aria-label={`删除新增属性 ${index + 1}`}
                  onClick={() => onRemoveNew(index)}
                />
              </Tooltip>
              <label className="requirement-property-field requirement-property-description">
                <span>说明</span>
                <TextArea
                  rows={2}
                  placeholder="描述属性含义、取值范围或使用场景"
                  value={property.description}
                  onChange={(event) => onUpdateNew(index, 'description', event.target.value)}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <Button type="dashed" onClick={onAddNew} block icon={<PlusOutlined />}>添加属性</Button>
    </>
  )
}
