import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {

  dados = [
    {
      nome: 'Solicitações',
      total: 40,
      detalhamento:[
        { label: 'MSA', total: 10, aprovado: 8, reprovado: 2 },
        { label: 'INSTRUMENTO', total: 10, aprovado: 8, reprovado: 2 },
      ],
    },
    {
      nome: 'MSA',
      total: 40,
      detalhamento:[
        { label: '1º Periodo', total: 10, aprovado: 8, reprovado: 2 },
        { label: '2º Periodo', total: 10, aprovado: 8, reprovado: 2 },
        { label: '3º Periodo', total: 10, aprovado: 8, reprovado: 2 },
        { label: '4º Periodo', total: 10, aprovado: 8, reprovado: 2 },
      ],
    },
    {
      nome: 'INSTRUMENTO',
      total: 40,
      detalhamento:[
        { label: 'RJM', total: 10, aprovado: 8, reprovado: 2 },
        { label: 'C.O', total: 10, aprovado: 8, reprovado: 2 },
        { label: 'OF', total: 10, aprovado: 8, reprovado: 2 },
      ],
    },
  ]


  constructor(private fb: FormBuilder) {
   
  }


}
