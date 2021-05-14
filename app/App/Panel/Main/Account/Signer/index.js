import React from 'react'
import Restore from 'react-restore'
import link from '../../../../../../resources/link'

class Balances extends React.Component {
  constructor (...args) {
    super(...args)
    this.moduleRef = React.createRef()
    this.resizeObserver = new ResizeObserver(() => {
      if (this.moduleRef && this.moduleRef.current) {
        link.send('tray:action', 'updateAccountModule', this.props.moduleId, { height: this.moduleRef.current.clientHeight })
      }
    })
    this.state = {
      expand: false
    }
  }
  componentDidMount () {
    this.resizeObserver.observe(this.moduleRef.current)
  } 
  render () {
    return (
      <div ref={this.moduleRef} className='balancesBlock'>
        <div className='moduleHeader'>{'Signer Status'}</div>  
        <div style={{ padding: '30px', display: 'flex', justifyContent: 'center' }}>
          {'Signer Status'}
        </div>
        
      </div>
    )
  }
}

export default Restore.connect(Balances)